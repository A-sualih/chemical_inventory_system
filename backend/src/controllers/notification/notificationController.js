const Notification = require('../../models/Notification');
const { createNotification } = require('../../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    const { type, severity, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (req.activeLabId) query.lab = req.activeLabId;
    
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
};

exports.getUnreadCount = async (req, res) => {
  try {
    const query = { status: 'unread' };
    if (req.activeLabId) query.lab = req.activeLabId;
    if (req.user.role !== 'Admin') {
      query.category = { $ne: 'security' };
    }
    
    const count = await Notification.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const labQuery = req.activeLabId ? { lab: req.activeLabId } : {};
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...labQuery },
      { status: 'read', isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

exports.dismissNotification = async (req, res) => {
  try {
    const labQuery = req.activeLabId ? { lab: req.activeLabId } : {};
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...labQuery },
      { status: 'dismissed' },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
};

exports.cleanupNotifications = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const labQuery = req.activeLabId ? { lab: req.activeLabId } : {};
    const result = await Notification.deleteMany({
      $or: [
        { status: 'dismissed', createdAt: { $lt: thirtyDaysAgo } },
        { status: 'read', createdAt: { $lt: thirtyDaysAgo } }
      ],
      ...labQuery
    });
    
    res.json({ message: 'Cleanup successful', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
};

exports.triggerTestNotification = async (req, res) => {
  try {
    const notification = await createNotification({
      type: 'SYSTEM',
      category: 'system',
      title: 'Diagnostic: Multi-Channel Alert Test',
      message: 'This is a test alert triggered from the Notification Center to verify Dashboard, Email, and SMS delivery.',
      severity: 'critical',
      priority: 1,
      metadata: {
        triggeredBy: req.user.name,
        ipAddress: req.ip
      },
      lab: req.activeLabId
    });
    
    res.json({ message: 'Test alert triggered successfully', notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger test alert' });
  }
};
