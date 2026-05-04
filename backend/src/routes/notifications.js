const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

// GET /api/notifications - Get notifications for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, severity, status, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by user or if notification is for everyone/role
    // Note: In a simple setup, we might show all alerts to everyone, 
    // but here we filter security alerts for admins only.
    if (req.user.role !== 'Admin') {
      query.category = { $ne: 'security' };
    }

    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread - Get unread count
router.get('/unread', authenticate, async (req, res) => {
  try {
    const query = { status: 'unread' };
    if (req.user.role !== 'Admin') {
      query.category = { $ne: 'security' };
    }
    
    const count = await Notification.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'read', isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// PATCH /api/notifications/:id/dismiss - Dismiss notification
router.patch('/:id/dismiss', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'dismissed' },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

// DELETE /api/notifications/cleanup - Admin cleanup of old notifications
router.delete('/cleanup', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Notification.deleteMany({
      $or: [
        { status: 'dismissed', createdAt: { $lt: thirtyDaysAgo } },
        { status: 'read', createdAt: { $lt: thirtyDaysAgo } }
      ]
    });
    
    res.json({ message: 'Cleanup successful', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// POST /api/notifications/test - Trigger a test notification for debugging
router.post('/test', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), async (req, res) => {

  try {
    const { createNotification } = require('../services/notificationService');
    const notification = await createNotification({
      type: 'SYSTEM',
      category: 'system',
      title: 'Diagnostic: Multi-Channel Alert Test',
      message: 'This is a test alert triggered from the Notification Center to verify Dashboard, Email, and SMS delivery.',
      severity: 'critical', // High enough to trigger all channels
      priority: 1,
      metadata: {
        triggeredBy: req.user.name,
        ipAddress: req.ip
      }
    });
    
    res.json({ message: 'Test alert triggered successfully', notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger test alert' });
  }
});

module.exports = router;



