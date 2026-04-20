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

module.exports = router;
