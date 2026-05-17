const Notification = require('../../models/Notification');
const { createNotification } = require('../../services/notificationService');

const applyRoleFilters = (query, user, requestedType) => {
  if (user.role === 'Admin') {
    const allowedTypes = ['UNAUTHORIZED_ACCESS', 'SYSTEM'];
    if (requestedType) {
      query.type = allowedTypes.includes(requestedType) ? requestedType : 'NONE';
    } else {
      query.type = { $in: allowedTypes };
    }
  } else if (user.role === 'Lab Manager') {
    const allowedTypes = ['LOW_STOCK', 'EXPIRY', 'COMPLIANCE', 'SYSTEM'];
    if (requestedType) {
      query.type = allowedTypes.includes(requestedType) ? requestedType : 'NONE';
    } else {
      query.type = { $in: allowedTypes };
    }
  } else if (user.role === 'Safety Officer') {
    const allowedTypes = [
      'COMPLIANCE', 'HAZARD', 'SYSTEM',
      'DISPOSAL', 'INCOMPATIBILITY', 'SPILL_INCIDENT',
      'STORAGE_CONDITION', 'MISSING_DOCUMENT', 'EMERGENCY', 'ENVIRONMENTAL_RISK'
    ];
    if (requestedType) {
      query.type = allowedTypes.includes(requestedType) ? requestedType : 'NONE';
    } else {
      query.type = { $in: allowedTypes };
    }
  } else if (['Lab Technician', 'Technician', 'Lab Technician'].includes(user.role)) {
    const allowedTypes = ['LOW_STOCK', 'EXPIRY', 'REQUEST_UPDATE', 'SYSTEM'];
    if (requestedType) {
      query.type = allowedTypes.includes(requestedType) ? requestedType : 'NONE';
    } else {
      query.type = { $in: allowedTypes };
    }
    // Only show REQUEST_UPDATE if the current user is the requester
    query.$or = [
      { type: { $ne: 'REQUEST_UPDATE' } },
      { 'metadata.user': user.id }
    ];
  } else {
    query.category = { $ne: 'security' };
    if (requestedType) query.type = requestedType;
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { type, severity, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (req.activeLabId) query.lab = req.activeLabId;
    
    applyRoleFilters(query, req.user, type);

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
    
    applyRoleFilters(query, req.user, null);
    
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
        triggeredByEmail: req.user.email,
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

/**
 * Trigger a specific notification type for testing.
 * POST /api/notifications/test/:type
 */
const TYPED_TEST_TEMPLATES = {
  LOW_STOCK:           { category: 'inventory', severity: 'high',     title: 'Test: Low Stock Alert',               message: 'TEST — Chemical Acetone has reached low stock level. Current quantity: 2 L.' },
  EXPIRY:              { category: 'safety',    severity: 'high',     title: 'Test: Expiry Warning',                message: 'TEST — Container C-001 of Hydrochloric Acid will expire in 5 days.' },
  UNAUTHORIZED_ACCESS: { category: 'security',  severity: 'high',     title: 'Test: Unauthorized Access',           message: 'TEST — Unauthorized attempt to access chemical records detected.' },
  COMPLIANCE:          { category: 'safety',    severity: 'high',     title: 'Test: Compliance Warning',            message: 'TEST — Disposal limit for Toxic chemicals has been exceeded for this period.' },
  DISPOSAL:            { category: 'safety',    severity: 'high',     title: 'Test: Disposal Alert',                message: 'TEST — A high-risk disposal request for Sulfuric Acid (50 L) has been submitted. Risk Level: Extreme.' },
  HAZARD:              { category: 'safety',    severity: 'critical', title: 'Test: Hazard Exposure',               message: 'TEST — A hazard exposure event (Inhalation) involving Chlorine Gas has been reported.' },
  INCOMPATIBILITY:     { category: 'safety',    severity: 'high',     title: 'Test: Incompatibility Warning',       message: 'TEST — Nitric Acid is incompatible with Flammable chemical stored at Cabinet A-01.' },
  SPILL_INCIDENT:      { category: 'safety',    severity: 'critical', title: 'Test: Spill Incident',                message: 'TEST — A chemical spill involving Methanol has been reported at Lab Room 204.' },
  STORAGE_CONDITION:   { category: 'safety',    severity: 'high',     title: 'Test: Unsafe Storage Condition',      message: 'TEST — Flammable chemical stored at room temperature without verified flammable cabinet.' },
  MISSING_DOCUMENT:    { category: 'safety',    severity: 'medium',   title: 'Test: Missing SDS Document',          message: 'TEST — Safety Data Sheet (SDS) is missing for Benzene. Upload the SDS to ensure compliance.' },
  EMERGENCY:           { category: 'safety',    severity: 'critical', title: 'TEST EMERGENCY: Chemical Hazard',      message: 'TEST — An emergency hazard event involving Hydrogen Peroxide. Evacuate and follow emergency protocols immediately.' },
  ENVIRONMENTAL_RISK:  { category: 'safety',    severity: 'high',     title: 'Test: Environmental Risk Warning',    message: 'TEST — Environmental risk detected for Toluene: Disposal of 200 L of Toxic chemical.' },
  REQUEST_UPDATE:      { category: 'system',    severity: 'medium',   title: 'Test: Chemical Request Rejected',     message: 'TEST — Your request for Ethanol was rejected: Insufficient budget for this period.' },
  SYSTEM:              { category: 'system',    severity: 'critical', title: 'Test: System Alert',                  message: 'TEST — System-level diagnostic notification triggered for multi-channel delivery verification.' },
};

exports.triggerTypedTestNotification = async (req, res) => {
  try {
    const { type } = req.params;
    const template = TYPED_TEST_TEMPLATES[type?.toUpperCase()];

    if (!template) {
      return res.status(400).json({
        error: `Unknown notification type: "${type}". Valid types: ${Object.keys(TYPED_TEST_TEMPLATES).join(', ')}`
      });
    }

    const notification = await createNotification({
      type: type.toUpperCase(),
      category: template.category,
      title: template.title,
      message: template.message,
      severity: template.severity,
      priority: template.severity === 'critical' ? 1 : template.severity === 'high' ? 2 : 3,
      lab: req.activeLabId,
      metadata: {
        triggeredByEmail: req.user.email,
        triggeredByName: req.user.name,
        // For REQUEST_UPDATE test, simulate requester = current user
        user: type.toUpperCase() === 'REQUEST_UPDATE' ? req.user.id : undefined
      }
    });

    res.json({
      message: `Test [${type.toUpperCase()}] notification triggered successfully`,
      routed_to_roles: {
        LOW_STOCK: ['Lab Manager'],
        EXPIRY: ['Lab Manager'],
        UNAUTHORIZED_ACCESS: ['Admin'],
        COMPLIANCE: ['Safety Officer', 'Lab Manager'],
        DISPOSAL: ['Safety Officer', 'Lab Manager'],
        HAZARD: ['Safety Officer', 'Lab Manager'],
        INCOMPATIBILITY: ['Safety Officer', 'Lab Manager'],
        SPILL_INCIDENT: ['Safety Officer', 'Lab Manager'],
        STORAGE_CONDITION: ['Safety Officer', 'Lab Manager'],
        MISSING_DOCUMENT: ['Safety Officer', 'Lab Manager'],
        EMERGENCY: ['Safety Officer', 'Lab Manager', 'Admin'],
        ENVIRONMENTAL_RISK: ['Safety Officer', 'Lab Manager'],
        REQUEST_UPDATE: ['Requester (current user)'],
        SYSTEM: ['Admin'],
      }[type.toUpperCase()] || ['Lab Manager'],
      notification
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger typed test notification' });
  }
};


