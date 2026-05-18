const Notification = require('../models/Notification');
const { sendEmail, formatNotificationEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

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
        ...(data.lab && { lab: data.lab })
      };

      if (data.related?.containerId) {
        matchCriteria['related.containerId'] = data.related.containerId;
      }

      // Prevent duplicate notifications for EXPIRY alerts only (since cron runs daily).
      // LOW_STOCK alerts are real-time and action-triggered, so they must be dispatched immediately.
      if (data.type === 'EXPIRY') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        notification = await Notification.findOne({
          ...matchCriteria,
          $or: [
            { status: 'unread' },
            { createdAt: { $gte: oneDayAgo } }
          ]
        });

        if (notification) {
          const hasSentEmail = notification.channels.some(c => c.type === 'email' && c.isSent === true);
          if (hasSentEmail) {
            // Notification already exists and is active/recent, and email has already been sent successfully.
            return notification;
          }
        }
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

    // TRIGGER EMAIL for high/critical severity, request updates, or disposal alerts
    if (data.severity === 'high' || data.severity === 'critical' || data.type === 'REQUEST_UPDATE' || data.type === 'DISPOSAL') {
      const User = require('../models/User');

      /**
       * Role-based email routing map.
       * Each notification type maps to the roles whose users should receive the email.
       * Types not explicitly listed fall back to ['Lab Manager'].
       */
      const TYPE_TO_ROLES = {
        // Admin only — security & system
        'UNAUTHORIZED_ACCESS': ['Admin'],
        'SYSTEM': ['Admin'],

        // Safety Officer (+ Lab Manager as backup) — all hazard & compliance types
        'HAZARD': ['Safety Officer', 'Lab Manager'],
        'COMPLIANCE': ['Safety Officer', 'Lab Manager'],
        // Include Lab Technicians and Laboratory Staff so they are kept in the loop on disposal approvals
        'DISPOSAL': ['Safety Officer', 'Lab Manager', 'Lab Technician', 'Laboratory Staff'],
        'INCOMPATIBILITY': ['Safety Officer', 'Lab Manager'],
        'SPILL_INCIDENT': ['Safety Officer', 'Lab Manager'],
        'STORAGE_CONDITION': ['Safety Officer', 'Lab Manager'],
        'MISSING_DOCUMENT': ['Safety Officer', 'Lab Manager'],
        'EMERGENCY': ['Safety Officer', 'Lab Manager', 'Admin'],
        'ENVIRONMENTAL_RISK': ['Safety Officer', 'Lab Manager'],

        // Lab Manager & Lab Technicians — operational inventory alerts
        'LOW_STOCK': ['Lab Manager', 'Lab Technician', 'Lab Technician', 'Technician', 'Lab technician', 'Admin'],
        'EXPIRY': ['Lab Manager',],
        'INFO': ['Lab Manager', 'Admin'],

        // REQUEST_UPDATE — email sent directly to the requester, handled separately
        'REQUEST_UPDATE': [],
      };

      const targetRoles = TYPE_TO_ROLES[data.type] ?? ['Lab Manager'];
      let recipientEmails = [];

      if (data.type === 'REQUEST_UPDATE') {
        // Email only the original requester (ObjectId stored in metadata.user)
        if (data.metadata?.user) {
          const requester = await User.findById(data.metadata.user).select('email status');
          if (requester && requester.status === 'Active' && requester.email) {
            recipientEmails.push(requester.email);
          }
        }
      } else if (targetRoles.length > 0) {
        const roleQuery = { status: 'Active', role: { $in: targetRoles } };
        // Scope to the lab that generated the alert — prevent cross-lab email leakage
        if (data.lab) roleQuery.labs = data.lab;

        const targetedUsers = await User.find(roleQuery).select('email');
        recipientEmails = targetedUsers.map(u => u.email);
      }

      // Always CC the action-triggering user (e.g. the technician who submitted a request)
      if (data.metadata?.triggeredByEmail && !recipientEmails.includes(data.metadata.triggeredByEmail)) {
        recipientEmails.push(data.metadata.triggeredByEmail);
      }

      // Fallback: if nothing resolved, use the system email
      if (recipientEmails.length === 0) {
        recipientEmails = [process.env.EMAIL_USER];
      }

      const emailHtml = formatNotificationEmail(data);

      // Fire and forget email dispatch so it doesn't block the HTTP response
      (async () => {
        let anySuccess = false;
        let lastError = null;

        for (const email of recipientEmails) {
          console.log(`[Email] Sending [${data.type}] "${data.title}" → ${email}`);
          const emailResult = await sendEmail(email, `[CIMS ALERT] ${data.title}`, emailHtml);
          if (emailResult.success) {
            console.log(`[Email] Delivered: ${emailResult.messageId} → ${email}`);
            anySuccess = true;
          } else {
            console.error(`[Email] Failed → ${email}:`, emailResult.error);
            lastError = emailResult.error?.message;
          }
        }

        try {
          if (anySuccess) {
            notification.channels.push({ type: 'email', isSent: true, sentAt: new Date() });
          } else {
            notification.channels.push({ type: 'email', isSent: false, error: lastError });
          }
          await notification.save();
        } catch (err) {
          console.error("Failed to update notification channels:", err);
        }
      })().catch(console.error);
    }

    // TRIGGER SMS for critical severity ONLY
    if (data.severity === 'critical') {
      const smsMessage = `[CIMS CRITICAL] ${data.title}: ${data.message}`;
      
      // Fire and forget SMS dispatch
      (async () => {
        try {
          await sendSMS(null, smsMessage);
          notification.channels.push({ type: 'sms', isSent: true, sentAt: new Date() });
          await notification.save();
        } catch (err) {
          console.error("Failed to send SMS or update notification channels:", err);
        }
      })().catch(console.error);
    }

    return notification;

  } catch (error) {
    console.error('Error creating notification:', error);
  }
};



/**
 * Specifically creates a low stock notification.
 */
const notifyLowStock = async (chemical, threshold, labId, user = null) => {
  return await createNotification({
    type: 'LOW_STOCK',
    category: 'inventory',
    title: `Low Stock: ${chemical.name}`,
    message: `Chemical ${chemical.name} has reached low stock level. Current quantity: ${chemical.quantity} ${chemical.unit}.`,
    severity: 'high',
    lab: labId || chemical.lab,
    priority: 3,
    related: {
      chemicalId: chemical.id,
      chemicalName: chemical.name
    },
    metadata: {
      currentQuantity: chemical.quantity,
      threshold: threshold,
      triggeredByEmail: user?.email,
      triggeredByName: user?.name
    }
  });
};

/**
 * Specifically creates an expiry notification.
 */
const notifyExpiry = async (chemical, container, daysRemaining, labId, user = null) => {
  const isExpired = daysRemaining <= 0;
  return await createNotification({
    type: 'EXPIRY',
    category: 'safety',
    title: isExpired ? `EXPIRED: ${chemical.name}` : `Expiry Warning: ${chemical.name}`,
    message: isExpired
      ? `Container ${container.container_id} of ${chemical.name} has expired!`
      : `Container ${container.container_id} of ${chemical.name} will expire in ${daysRemaining} days.`,
    severity: isExpired ? 'critical' : 'high',
    lab: labId || container.lab || chemical.lab,
    priority: isExpired ? 1 : 2,
    related: {
      chemicalId: chemical.id,
      chemicalName: chemical.name,
      containerId: container.container_id
    },
    metadata: {
      expiryDate: container.expiry_date,
      daysRemaining: daysRemaining,
      triggeredByEmail: user?.email,
      triggeredByName: user?.name
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
const notifyHazardWarning = async (chemical, action, user, labId) => {
  return await createNotification({
    type: 'HAZARD',
    category: 'safety',
    title: `Safety Alert: High Hazard Chemical ${action}`,
    message: `${chemical.name} (Hazards: ${chemical.ghs_classes?.join(', ') || 'Unknown'}) was ${action} by ${user?.name || 'a user'}. Verify safety protocols and storage compatibility.`,
    severity: 'critical',
    lab: labId || chemical.lab,
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

/**
 * Disposal chemical alert — triggered when a high-risk disposal request is submitted.
 */
const notifyDisposalAlert = async (chemical, quantity, unit, riskLevel, labId, user = null) => {
  return await createNotification({
    type: 'DISPOSAL',
    category: 'safety',
    title: `Disposal Alert: ${chemical.name}`,
    message: `A disposal request for ${quantity} ${unit} of ${chemical.name} has been submitted. Risk Level: ${riskLevel}.`,
    severity: riskLevel === 'Extreme' ? 'critical' : 'high',
    priority: riskLevel === 'Extreme' ? 1 : 2,
    lab: labId || chemical.lab,
    related: { chemicalId: String(chemical._id || chemical.id), chemicalName: chemical.name },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: `Disposal Requested (${riskLevel} Risk)`
    }
  });
};

/**
 * Chemical incompatibility warning.
 */
const notifyIncompatibility = async (chemical, incompatibleWith, labId, user = null) => {
  return await createNotification({
    type: 'INCOMPATIBILITY',
    category: 'safety',
    title: `Incompatibility Warning: ${chemical.name}`,
    message: `${chemical.name} is incompatible with ${incompatibleWith}. Ensure proper separation and storage segregation.`,
    severity: 'high',
    priority: 2,
    lab: labId || chemical.lab,
    related: { chemicalId: String(chemical._id || chemical.id), chemicalName: chemical.name },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: 'Incompatibility Detected'
    }
  });
};

/**
 * Spill incident alert.
 */
const notifySpillIncident = async ({ chemicalName, chemicalId, severity, location, labId, user }) => {
  return await createNotification({
    type: 'SPILL_INCIDENT',
    category: 'safety',
    title: `Spill Incident: ${chemicalName}`,
    message: `A chemical spill involving ${chemicalName} has been reported at ${location || 'an unknown location'}. Immediate response required.`,
    severity: severity || 'critical',
    priority: 1,
    lab: labId,
    related: { chemicalId: chemicalId ? String(chemicalId) : undefined, chemicalName },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: 'Spill Incident Reported'
    }
  });
};

/**
 * Unsafe storage condition alert.
 */
const notifyUnsafeStorage = async (chemical, issue, labId, user = null) => {
  return await createNotification({
    type: 'STORAGE_CONDITION',
    category: 'safety',
    title: `Unsafe Storage: ${chemical.name}`,
    message: `Unsafe storage condition detected for ${chemical.name}: ${issue}. Please review storage requirements immediately.`,
    severity: 'high',
    priority: 2,
    lab: labId || chemical.lab,
    related: { chemicalId: String(chemical._id || chemical.id), chemicalName: chemical.name },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: 'Unsafe Storage Detected'
    }
  });
};

/**
 * Missing SDS document alert.
 */
const notifyMissingSDS = async (chemical, labId, user = null) => {
  return await createNotification({
    type: 'MISSING_DOCUMENT',
    category: 'safety',
    title: `Missing SDS: ${chemical.name}`,
    message: `Safety Data Sheet (SDS) is missing for ${chemical.name}. Upload or link the SDS document to ensure regulatory compliance.`,
    severity: 'medium',
    priority: 3,
    lab: labId || chemical.lab,
    related: { chemicalId: String(chemical._id || chemical.id), chemicalName: chemical.name },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: 'Missing SDS Detected'
    }
  });
};

/**
 * Emergency hazard alert (highest urgency).
 */
const notifyEmergencyHazard = async ({ title, message, chemicalName, chemicalId, labId, user }) => {
  return await createNotification({
    type: 'EMERGENCY',
    category: 'safety',
    title: title || `EMERGENCY: ${chemicalName}`,
    message: message || `An emergency hazard event has been triggered involving ${chemicalName}. Evacuate and follow emergency protocols immediately.`,
    severity: 'critical',
    priority: 1,
    lab: labId,
    related: { chemicalId: chemicalId ? String(chemicalId) : undefined, chemicalName },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: 'Emergency Hazard Triggered'
    }
  });
};

/**
 * Environmental risk warning.
 */
const notifyEnvironmentalRisk = async (chemical, details, labId, user = null) => {
  return await createNotification({
    type: 'ENVIRONMENTAL_RISK',
    category: 'safety',
    title: `Environmental Risk: ${chemical.name}`,
    message: `Environmental risk detected for ${chemical.name}: ${details}. Review disposal and containment procedures immediately.`,
    severity: 'high',
    priority: 2,
    lab: labId || chemical.lab,
    related: { chemicalId: String(chemical._id || chemical.id), chemicalName: chemical.name },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: 'Environmental Risk Detected'
    }
  });
};

/**
 * Hazard exposure alert.
 */
const notifyHazardExposure = async ({ chemicalName, chemicalId, exposureType, affectedPersons, labId, user }) => {
  return await createNotification({
    type: 'HAZARD',
    category: 'safety',
    title: `Hazard Exposure: ${chemicalName}`,
    message: `A hazard exposure event (${exposureType}) involving ${chemicalName} has been reported. ${affectedPersons ? `Affected: ${affectedPersons}.` : ''} Immediate medical assessment may be required.`,
    severity: 'critical',
    priority: 1,
    lab: labId,
    related: { chemicalId: chemicalId ? String(chemicalId) : undefined, chemicalName },
    metadata: {
      triggeredByEmail: user?.email,
      triggeredByName: user?.name,
      action: 'Hazard Exposure Reported'
    }
  });
};

module.exports = {
  createNotification,
  notifyLowStock,
  notifyExpiry,
  notifyUnauthorizedAccess,
  notifyHazardWarning,
  notifyDisposalAlert,
  notifyIncompatibility,
  notifySpillIncident,
  notifyUnsafeStorage,
  notifyMissingSDS,
  notifyEmergencyHazard,
  notifyEnvironmentalRisk,
  notifyHazardExposure
};




