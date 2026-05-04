const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const router = express.Router();

/**
 * @route GET /api/audit
 * @desc Get audit logs with filtering
 * @access Admin (VIEW_AUDIT_LOGS)
 */
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOGS), async (req, res) => {
  try {
    const { user, action, targetType, startDate, endDate, limit = 100, page = 1 } = req.query;

    const query = {};

    if (user) {
      query.$or = [
        { 'user.name': { $regex: user, $options: 'i' } },
        { 'user.email': { $regex: user, $options: 'i' } }
      ];
    }

    if (action) {
      query.action = action.toUpperCase();
    }

    if (targetType) {
      query['target.type'] = targetType.toLowerCase();
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error('Fetch Audit Logs Error:', err);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

module.exports = router;


