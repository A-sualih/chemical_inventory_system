const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireRole, ROLES } = require('../authMiddleware');

const router = express.Router();

// Get audit logs (Admin, Manager, Safety Officer, Viewer/Auditor)
router.get('/', authenticate, requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER, ROLES.SAFETY_OFFICER, ROLES.VIEWER]), async (req, res) => {
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
