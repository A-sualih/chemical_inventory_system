const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../authMiddleware');

const router = express.Router();

// Generate comprehensive Analytics Report (1.10)
router.get('/analytics', authenticate, requireRole(['Admin', 'Lab Manager', 'Safety Officer', 'Viewer/Auditor']), async (req, res) => {
  const db = await getDb();
  try {
    // KPI 1: Inventory Health
    const totalChemicals = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE archived = 0');
    const lowStock = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE status = ? AND archived = 0', ['Low Stock']);
    
    // KPI 2: Hazards Distribution
    const flammables = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE ghs_classes LIKE ? AND archived = 0', ['%Flammable%']);
    const toxics = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE ghs_classes LIKE ? AND archived = 0', ['%Toxic%']);
    const corrosives = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE ghs_classes LIKE ? AND archived = 0', ['%Corrosive%']);

    // KPI 3: Recent Activity (Last 30 Days)
    const recentDisposals = await db.get('SELECT SUM(quantity) as total_disposed FROM disposals WHERE created_at >= date(\'now\', \'-30 days\')');
    const recentRequests = await db.get('SELECT COUNT(*) as count FROM requests WHERE created_at >= date(\'now\', \'-30 days\') AND status = ?', ['Approved']);

    // Usage Trends (Aggregated by action type over time)
    const usageData = await db.all(`
      SELECT action, SUM(quantity_change) as total, strftime('%Y-%m', timestamp) as month
      FROM inventory_logs
      GROUP BY action, month
      ORDER BY month DESC LIMIT 12
    `);

    res.json({
      summary: {
        total: totalChemicals.count,
        low_stock: lowStock.count,
        disposed_30d: Math.round(recentDisposals.total_disposed || 0) + ' L/kg',
        approved_requests_30d: recentRequests.count
      },
      hazards: [
        { name: 'Flammable', value: flammables.count },
        { name: 'Toxic', value: toxics.count },
        { name: 'Corrosive', value: corrosives.count },
      ],
      usage: usageData
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error generating reports' });
  }
});

module.exports = router;
