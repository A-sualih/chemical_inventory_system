const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole, ROLES } = require('../authMiddleware');

const router = express.Router();

// Get audit logs (Admin, Manager, Safety Officer, Viewer/Auditor)
router.get('/', authenticate, requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER, ROLES.SAFETY_OFFICER, ROLES.VIEWER]), async (req, res) => {
  const db = await getDb();
  try {
    const logs = await db.all(`
      SELECT a.*, u.name as user_name 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.timestamp DESC LIMIT 200
    `);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

module.exports = router;
