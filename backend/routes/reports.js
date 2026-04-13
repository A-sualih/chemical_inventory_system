const express = require('express');
const Chemical = require('../models/Chemical');
const Disposal = require('../models/Disposal');
const Request = require('../models/Request');
const InventoryLog = require('../models/InventoryLog');
const { authenticate, authorize } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const router = express.Router();

// Generate comprehensive Analytics Report
router.get('/analytics', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), async (req, res) => {
  try {
    // KPI 1: Inventory Health
    const totalCount = await Chemical.countDocuments({ archived: false });
    const lowStockCount = await Chemical.countDocuments({ status: 'Low Stock', archived: false });
    
    // KPI 2: Hazards Distribution
    // Note: In a real app, you'd use a better pattern match for GHS classes
    const flammables = await Chemical.countDocuments({ ghs_classes: /Flammable/i, archived: false });
    const toxics = await Chemical.countDocuments({ ghs_classes: /Toxic/i, archived: false });
    const corrosives = await Chemical.countDocuments({ ghs_classes: /Corrosive/i, archived: false });

    // KPI 3: Recent Activity (Last 30 Days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentDisposals = await Disposal.aggregate([
      { $match: { created_at: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total_disposed: { $sum: "$quantity" } } }
    ]);
    const recentRequestsCount = await Request.countDocuments({ 
      created_at: { $gte: thirtyDaysAgo }, 
      status: 'Approved' 
    });

    // Usage Trends
    const usageData = await InventoryLog.aggregate([
      { 
        $group: { 
          _id: { 
            action: "$action", 
            month: { $dateToString: { format: "%Y-%m", date: "$timestamp" } } 
          }, 
          total: { $sum: "$quantity_change" } 
        } 
      },
      { $sort: { "_id.month": -1 } },
      { $limit: 12 }
    ]);

    res.json({
      summary: {
        total: totalCount,
        low_stock: lowStockCount,
        disposed_30d: (recentDisposals[0]?.total_disposed || 0).toFixed(1) + ' L/kg',
        approved_requests_30d: recentRequestsCount
      },
      hazards: [
        { name: 'Flammable', value: flammables },
        { name: 'Toxic', value: toxics },
        { name: 'Corrosive', value: corrosives },
      ],
      usage: usageData.map(u => ({ action: u._id.action, total: u.total, month: u._id.month }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating reports' });
  }
});

module.exports = router;
