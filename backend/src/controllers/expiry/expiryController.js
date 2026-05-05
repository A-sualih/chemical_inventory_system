const Batch = require('../../models/Batch');
const Container = require('../../models/Container');
const Chemical = require('../../models/Chemical');
const mongoose = require('mongoose');

exports.getExpirySummary = async (req, res) => {
  try {
    const { status } = req.query;
    const now = new Date();
    const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
    const nearExpiryCutoff = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);

    const batches = await Batch.find({}).lean();
    const containers = await Container.find({}).lean();

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

    let combined = [...batchExpiryList, ...containerExpiryList];
    combined = combined.filter(item => item.expiryDate);

    if (status) {
      combined = combined.filter(item => item.status === status);
    }

    combined.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    const chemicalIds = [...new Set(combined.map(item => item.chemicalId))];
    const chemicals = await Chemical.find({ 
      id: { $in: chemicalIds },
      archived: false 
    }).select('id name').lean();
    
    const activeChemMap = {};
    chemicals.forEach(c => activeChemMap[c.id] = c.name);

    const enriched = combined
      .filter(item => activeChemMap[item.chemicalId])
      .map(item => ({
        ...item,
        chemicalName: activeChemMap[item.chemicalId]
      }));

    res.json(enriched);
  } catch (err) {
    console.error('Expiry Summary Error:', err);
    res.status(500).json({ error: 'Failed to fetch expiry data' });
  }
};

exports.purgeExpired = async (req, res) => {
  try {
    const now = new Date();

    const expiredBatches = await Batch.find({
      expiry_date: { $lt: now }
    }).lean();

    const expiredContainers = await Container.find({
      expiry_date: { $lt: now }
    }).lean();

    const expiredBatchIds   = expiredBatches.map(b => b._id);
    const expiredContainerIds = expiredContainers.map(c => c._id);

    const affectedChemicalIds = [...new Set([
      ...expiredBatches.map(b => b.chemical_id),
      ...expiredContainers.map(c => c.chemical_id)
    ])];

    const batchResult     = await Batch.deleteMany({ _id: { $in: expiredBatchIds } });
    const containerResult = await Container.deleteMany({ _id: { $in: expiredContainerIds } });

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
};

exports.deleteExpiryRecord = async (req, res) => {
  try {
    const { type, id } = req.params;
    let chemicalId = null;

    if (type === 'batch') {
      const batch = await Batch.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
          { batch_number: id }
        ].filter(q => q._id !== undefined || q.batch_number !== undefined)
      });
      if (!batch) return res.status(404).json({ error: 'Batch not found.' });
      chemicalId = batch.chemical_id;
      await Batch.deleteOne({ _id: batch._id });
    } else if (type === 'container') {
      const container = await Container.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : undefined },
          { container_id: id }
        ].filter(q => q._id !== undefined || q.container_id !== undefined)
      });
      if (!container) return res.status(404).json({ error: 'Container not found.' });
      chemicalId = container.chemical_id;
      await Container.deleteOne({ _id: container._id });
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "batch" or "container".' });
    }

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
};
