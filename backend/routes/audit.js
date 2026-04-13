const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const router = express.Router();

// Get audit logs
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOGS), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('user_id', 'name')
      .sort({ timestamp: -1 })
      .limit(200);
    
    const logsWithUserNames = logs.map(log => ({
      ...log.toObject(),
      user_name: log.user_id ? log.user_id.name : 'System'
    }));

    res.json(logsWithUserNames);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

module.exports = router;
