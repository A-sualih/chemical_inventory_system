const Notification = require('../models/Notification');

/**
 * Creates a notification in the system.
 * @param {Object} data - Notification data matching the schema
 */
const createNotification = async (data) => {
  try {
    // Check for duplicate notifications of the same type/related item within the last hour to debounce
    if (data.related?.chemicalId && data.type) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await Notification.findOne({
        type: data.type,
        'related.chemicalId': data.related.chemicalId,
        createdAt: { $gte: oneHourAgo },
        status: 'unread'
      });
      
      if (existing) {
        // Update existing notification instead of creating a new one if it's recent and unread
        existing.message = data.message;
        existing.metadata = { ...existing.metadata, ...data.metadata };
        return await existing.save();
      }
    }

    const notification = new Notification({
      ...data,
      isRead: false,
      status: 'unread',
      channels: data.channels || [{ type: 'dashboard', isSent: true, sentAt: new Date() }]
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Specifically creates a low stock notification.
 */
const notifyLowStock = async (chemical, threshold) => {
  return await createNotification({
    type: 'LOW_STOCK',
    category: 'inventory',
    title: `Low Stock: ${chemical.name}`,
    message: `Chemical ${chemical.name} has reached low stock level. Current quantity: ${chemical.quantity} ${chemical.unit}.`,
    severity: 'medium',
    priority: 3,
    related: {
      chemicalId: chemical.id,
      chemicalName: chemical.name
    },
    metadata: {
      currentQuantity: chemical.quantity,
      threshold: threshold
    }
  });
};

/**
 * Specifically creates an expiry notification.
 */
const notifyExpiry = async (chemical, container, daysRemaining) => {
  const isExpired = daysRemaining <= 0;
  return await createNotification({
    type: 'EXPIRY',
    category: 'safety',
    title: isExpired ? `EXPIRED: ${chemical.name}` : `Expiry Warning: ${chemical.name}`,
    message: isExpired 
      ? `Container ${container.container_id} of ${chemical.name} has expired!` 
      : `Container ${container.container_id} of ${chemical.name} will expire in ${daysRemaining} days.`,
    severity: isExpired ? 'critical' : 'high',
    priority: isExpired ? 1 : 2,
    related: {
      chemicalId: chemical.id,
      chemicalName: chemical.name,
      containerId: container.container_id
    },
    metadata: {
      expiryDate: container.expiry_date,
      daysRemaining: daysRemaining
    }
  });
};

/**
 * Specifically creates an unauthorized access notification.
 */
const notifyUnauthorizedAccess = async (user, action, ip, device) => {
  return await createNotification({
    type: 'UNAUTHORIZED_ACCESS',
    category: 'security',
    title: 'Security Alert: Unauthorized Access',
    message: `Unauthorized attempt to ${action} by ${user ? user.email : 'Unknown User'}.`,
    severity: 'high',
    priority: 1,
    metadata: {
      ipAddress: ip,
      device: device,
      attemptedAction: action
    }
  });
};

module.exports = {
  createNotification,
  notifyLowStock,
  notifyExpiry,
  notifyUnauthorizedAccess
};
