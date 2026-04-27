const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const Container = require('../models/Container');
const Chemical = require('../models/Chemical');
const { authenticate, authorize } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');

/**
 * @route GET /api/expiry/summary
 * @desc Get all batches and containers with expiry status, sorted by nearest expiry
 * @access Admin, Lab Manager, Safety Officer, Lab Technician
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { status, filter } = req.query;
    const now = new Date();
    const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
    const nearExpiryCutoff = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);

    // Fetch Batches
    const batches = await Batch.find({ status: { $ne: 'Recalled' } }).lean();
    
    // Fetch Containers
    const containers = await Container.find({ status: { $nin: ['Empty', 'Damaged'] } }).lean();

    // Map to unified format
    const batchExpiryList = batches.map(b => {
      const expDate = b.expiry_date ? new Date(b.expiry_date) : null;
      let currentStatus = 'active';
      if (expDate) {
        if (expDate < now) currentStatus = 'expired';
        else if (expDate < nearExpiryCutoff) currentStatus = 'near_expiry';
      }

      return {
        type: 'Batch',
        id: b._id,
        chemicalId: b.chemical_id,
        batchId: b.batch_number,
        containerId: null,
        expiryDate: b.expiry_date,
        quantity: b.total_quantity,
        unit: b.unit,
        location: `${b.building || ''} ${b.room || ''}`.trim() || 'N/A',
        status: currentStatus
      };
    });

    const containerExpiryList = containers.map(c => {
      const expDate = c.expiry_date ? new Date(c.expiry_date) : null;
      let currentStatus = 'active';
      if (expDate) {
        if (expDate < now) currentStatus = 'expired';
        else if (expDate < nearExpiryCutoff) currentStatus = 'near_expiry';
      }

      return {
        type: 'Container',
        id: c._id,
        chemicalId: c.chemical_id,
        batchId: c.batch_number,
        containerId: c.container_id,
        expiryDate: c.expiry_date,
        quantity: c.quantity,
        unit: c.unit,
        location: `${c.building || ''} ${c.room || ''}`.trim() || 'N/A',
        status: currentStatus
      };
    });

    // Combine
    let combined = [...batchExpiryList, ...containerExpiryList];

    // Filter by mandatory expiry date (as per request: "Each chemical batch and/or container must store an expiry date field")
    combined = combined.filter(item => item.expiryDate);

    // Filter by status if requested
    if (status) {
      combined = combined.filter(item => item.status === status);
    }

    // Sort by nearest expiry
    combined.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    // Enrich with Chemical Names
    const chemicalIds = [...new Set(combined.map(item => item.chemicalId))];
    const chemicals = await Chemical.find({ id: { $in: chemicalIds } }).select('id name').lean();
    const chemMap = {};
    chemicals.forEach(c => chemMap[c.id] = c.name);

    const enriched = combined.map(item => ({
      ...item,
      chemicalName: chemMap[item.chemicalId] || 'Unknown Chemical'
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Expiry Summary Error:', err);
    res.status(500).json({ error: 'Failed to fetch expiry data' });
  }
});

/**
 * @route DELETE /api/expiry/purge-expired
 * @desc  Bulk-delete ALL expired batches, containers and their parent Chemical records
 * @access Admin, Lab Manager
 */
router.delete('/purge-expired', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), async (req, res) => {
  try {
    const now = new Date();

    // 1. Find all expired Batches
    const expiredBatches = await Batch.find({
      expiry_date: { $lt: now }
    }).lean();

    // 2. Find all expired Containers
    const expiredContainers = await Container.find({
      expiry_date: { $lt: now }
    }).lean();

    const expiredBatchIds   = expiredBatches.map(b => b._id);
    const expiredContainerIds = expiredContainers.map(c => c._id);

    // Collect the chemical IDs that had expired records
    const affectedChemicalIds = [...new Set([
      ...expiredBatches.map(b => b.chemical_id),
      ...expiredContainers.map(c => c.chemical_id)
    ])];

    // 3. Delete expired Batches and Containers
    const batchResult     = await Batch.deleteMany({ _id: { $in: expiredBatchIds } });
    const containerResult = await Container.deleteMany({ _id: { $in: expiredContainerIds } });

    // 4. For each affected chemical: if NO valid (non-expired) batches/containers remain, delete the Chemical record too
    let deletedChemicalCount = 0;
    const deletedChemicalIds = [];

    for (const chemId of affectedChemicalIds) {
      const remainingBatches    = await Batch.countDocuments({ chemical_id: chemId });
      const remainingContainers = await Container.countDocuments({ chemical_id: chemId });

      if (remainingBatches === 0 && remainingContainers === 0) {
        await Chemical.deleteOne({ id: chemId });
        deletedChemicalIds.push(chemId);
        deletedChemicalCount++;
      } else {
        // Recalculate chemical quantity from remaining containers
        const remaining = await Container.find({ chemical_id: chemId, quantity: { $gt: 0 } });
        const totalQty = remaining.reduce((sum, c) => sum + (c.quantity || 0), 0);
        await Chemical.updateOne({ id: chemId }, {
          $set: {
            quantity: totalQty,
            status: totalQty <= 0 ? 'Out of Stock' : totalQty < 5 ? 'Low Stock' : 'In Stock'
          }
        });
      }
    }

    res.json({
      message: 'Expired inventory purged successfully.',
      deletedBatches: batchResult.deletedCount,
      deletedContainers: containerResult.deletedCount,
      deletedChemicals: deletedChemicalCount,
      deletedChemicalIds
    });
  } catch (err) {
    console.error('Purge Expired Error:', err);
    res.status(500).json({ error: 'Failed to purge expired items.' });
  }
});

/**
 * @route DELETE /api/expiry/:type/:id
 * @desc  Delete a single expired Batch or Container (and its Chemical if orphaned)
 * @access Admin, Lab Manager
 */
router.delete('/:type/:id', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), async (req, res) => {
  try {
    const { type, id } = req.params; // type = 'batch' | 'container'
    let chemicalId = null;

    if (type === 'batch') {
      const batch = await Batch.findById(id);
      if (!batch) return res.status(404).json({ error: 'Batch not found.' });
      chemicalId = batch.chemical_id;
      await Batch.deleteOne({ _id: id });
    } else if (type === 'container') {
      const container = await Container.findById(id);
      if (!container) return res.status(404).json({ error: 'Container not found.' });
      chemicalId = container.chemical_id;
      await Container.deleteOne({ _id: id });
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "batch" or "container".' });
    }

    // Orphan check: if no more batches or containers exist for this chemical, delete the Chemical record too
    let chemicalDeleted = false;
    if (chemicalId) {
      const remainingBatches    = await Batch.countDocuments({ chemical_id: chemicalId });
      const remainingContainers = await Container.countDocuments({ chemical_id: chemicalId });

      if (remainingBatches === 0 && remainingContainers === 0) {
        await Chemical.deleteOne({ id: chemicalId });
        chemicalDeleted = true;
      } else {
        const remaining = await Container.find({ chemical_id: chemicalId, quantity: { $gt: 0 } });
        const totalQty = remaining.reduce((sum, c) => sum + (c.quantity || 0), 0);
        await Chemical.updateOne({ id: chemicalId }, {
          $set: {
            quantity: totalQty,
            status: totalQty <= 0 ? 'Out of Stock' : totalQty < 5 ? 'Low Stock' : 'In Stock'
          }
        });
      }
    }

    res.json({
      message: `${type === 'batch' ? 'Batch' : 'Container'} deleted successfully.`,
      chemicalDeleted,
      chemicalId
    });
  } catch (err) {
    console.error('Delete Expiry Record Error:', err);
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

module.exports = router;

