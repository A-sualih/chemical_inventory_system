const Notification = require('../models/Notification');
const { sendEmail, formatNotificationEmail } = require('./emailService');
const { sendSMS } = require('./smsService');

/**
 * Creates a notification in the system.
 * @param {Object} data - Notification data matching the schema
 */
const createNotification = async (data) => {
  try {
    let notification;
    if (data.related?.chemicalId && data.type) {
      const matchCriteria = {
        type: data.type,
        'related.chemicalId': data.related.chemicalId,
      };
      
      if (data.related?.containerId) {
        matchCriteria['related.containerId'] = data.related.containerId;
      }

      // Prevent duplicate notifications (especially for Expiry/Low Stock)
      // Check if there is an active (unread) alert OR a recently created alert (within 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      notification = await Notification.findOne({
        ...matchCriteria,
        $or: [
          { status: 'unread' },
          { createdAt: { $gte: oneDayAgo } }
        ]
      });
      
      if (notification) {
        // Notification already exists and is active/recent. Do not recreate or re-email.
        return notification;
      }
    }

    if (!notification) {
      notification = new Notification({
        ...data,
        isRead: false,
        status: 'unread',
        channels: data.channels || [{ type: 'dashboard', isSent: true, sentAt: new Date() }]
      });
      await notification.save();
    }

    // TRIGGER EMAIL for high/critical severity
    if (data.severity === 'high' || data.severity === 'critical') {
      const User = require('../models/User');
      const labManagers = await User.find({ role: 'Lab Manager', status: 'Active' });
      
      let recipientEmails = labManagers.map(mgr => mgr.email);
      // Fallback to EMAIL_USER if no lab managers exist in the DB
      if (recipientEmails.length === 0) {
         recipientEmails = [process.env.EMAIL_USER];
      }

      const emailHtml = formatNotificationEmail(data);
      let anySuccess = false;
      let lastError = null;

      for (const email of recipientEmails) {
         console.log(`[Email] Attempting to send alert: ${data.title} to ${email}`);
         const emailResult = await sendEmail(email, `[CIMS ALERT] ${data.title}`, emailHtml);
         if (emailResult.success) {
            console.log(`[Email] Successfully delivered: ${emailResult.messageId} to ${email}`);
            anySuccess = true;
         } else {
            console.error(`[Email] Failed delivery to ${email}:`, emailResult.error);
            lastError = emailResult.error?.message;
         }
      }
      
      if (anySuccess) {
        notification.channels.push({ type: 'email', isSent: true, sentAt: new Date() });
      } else {
        notification.channels.push({ type: 'email', isSent: false, error: lastError });
      }
      await notification.save();
    }

    // TRIGGER SMS for critical severity ONLY
    if (data.severity === 'critical') {
      const smsMessage = `[CIMS CRITICAL] ${data.title}: ${data.message}`;
      await sendSMS(null, smsMessage);
      
      notification.channels.push({ type: 'sms', isSent: true, sentAt: new Date() });
      await notification.save();
    }

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
    severity: 'high',

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

/**
 * Specifically creates a hazard warning notification.
 */
const notifyHazardWarning = async (chemical, action, user) => {
  return await createNotification({
    type: 'HAZARD',
    category: 'safety',
    title: `Safety Alert: High Hazard Chemical ${action}`,
    message: `${chemical.name} (Hazards: ${chemical.ghs_classes?.join(', ') || 'Unknown'}) was ${action} by ${user?.name || 'a user'}. Verify safety protocols and storage compatibility.`,
    severity: 'critical',
    priority: 1,
    related: {
      chemicalId: chemical.id,
      chemicalName: chemical.name
    },
    metadata: {
      hazards: chemical.ghs_classes,
      action: action,
      user: user?.name
    }
  });
};

module.exports = {
  createNotification,
  notifyLowStock,
  notifyExpiry,
  notifyUnauthorizedAccess,
  notifyHazardWarning
};
