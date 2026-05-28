const Notification = require('../models/Notification');
const { sendEmail, formatNotificationEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

const GLOBAL_TYPES = new Set(['UNAUTHORIZED_ACCESS']);

/**
 * Creates a notification in the system.
 * Lab is required for all types except global security alerts.
 * Emails are only sent to users assigned to that lab.
 */
const createNotification = async (data) => {
  try {
    const resolvedLab = data.lab || null;
    if (!resolvedLab && !GLOBAL_TYPES.has(data.type)) {
      console.warn(
        `[Notification] Refusing to create ${data.type} without lab — cross-lab leak prevented.`
      );
      return null;
    }

    const payload = { ...data, lab: resolvedLab };

    let notification;
    if (payload.related?.chemicalId && payload.type) {
      const matchCriteria = {
        type: payload.type,
        'related.chemicalId': payload.related.chemicalId,
        ...(resolvedLab && { lab: resolvedLab })
      };

      if (payload.related?.containerId) {
        matchCriteria['related.containerId'] = payload.related.containerId;
      }

      if (payload.type === 'EXPIRY') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        notification = await Notification.findOne({
          ...matchCriteria,
          $or: [{ status: 'unread' }, { createdAt: { $gte: oneDayAgo } }]
        });

        if (notification) {
          const hasSentEmail = notification.channels.some((c) => c.type === 'email' && c.isSent === true);
          if (hasSentEmail) {
            return notification;
          }
        }
      }
    }

    if (!notification) {
      // Attach lab-scoped recipients for dashboard filtering / audit
      let recipients = payload.recipients || [];
      if ((!recipients || recipients.length === 0) && resolvedLab) {
        try {
          const User = require('../models/User');
          const labUsers = await User.find({
            status: 'Active',
            labs: resolvedLab
          })
            .select('_id role')
            .lean();
          recipients = labUsers.map((u) => ({ userId: u._id, role: u.role }));
        } catch (e) {
          console.error('[Notification] Failed to resolve lab recipients:', e.message);
        }
      }

      notification = new Notification({
        ...payload,
        recipients,
        isRead: false,
        status: 'unread',
        channels: payload.channels || [{ type: 'dashboard', isSent: true, sentAt: new Date() }]
      });
      await notification.save();
    }

    if (
      payload.severity === 'high' ||
      payload.severity === 'critical' ||
      payload.type === 'REQUEST_UPDATE' ||
      payload.type === 'DISPOSAL'
    ) {
      const User = require('../models/User');

      const TYPE_TO_ROLES = {
        UNAUTHORIZED_ACCESS: ['Admin'],
        SYSTEM: ['Admin'],
        HAZARD: ['Safety Officer', 'Lab Manager'],
        COMPLIANCE: ['Safety Officer', 'Lab Manager'],
        DISPOSAL: ['Safety Officer', 'Lab Manager', 'Lab Technician'],
        INCOMPATIBILITY: ['Safety Officer', 'Lab Manager'],
        SPILL_INCIDENT: ['Safety Officer', 'Lab Manager'],
        STORAGE_CONDITION: ['Safety Officer', 'Lab Manager'],
        MISSING_DOCUMENT: ['Safety Officer', 'Lab Manager'],
        EMERGENCY: ['Safety Officer', 'Lab Manager', 'Admin'],
        ENVIRONMENTAL_RISK: ['Safety Officer', 'Lab Manager'],
        LOW_STOCK: ['Lab Manager', 'Lab Technician', 'Admin'],
        EXPIRY: ['Lab Manager'],
        INFO: ['Lab Manager', 'Admin'],
        REQUEST_UPDATE: []
      };

      const targetRoles = TYPE_TO_ROLES[payload.type] ?? ['Lab Manager'];
      let recipientEmails = [];

      if (payload.type === 'REQUEST_UPDATE') {
        if (payload.metadata?.user) {
          const requester = await User.findById(payload.metadata.user).select('email status labs');
          if (requester && requester.status === 'Active' && requester.email) {
            // Only email if requester belongs to this notification's lab (when lab set)
            const inLab =
              !resolvedLab ||
              (requester.labs || []).some((id) => String(id) === String(resolvedLab));
            if (inLab) recipientEmails.push(requester.email);
          }
        }
      } else if (targetRoles.length > 0) {
        const roleQuery = { status: 'Active', role: { $in: targetRoles } };
        // Hard lab isolation for email — never email users outside the lab
        if (resolvedLab) {
          roleQuery.labs = resolvedLab;
        } else if (!GLOBAL_TYPES.has(payload.type)) {
          console.warn(`[Notification] Skipping email for ${payload.type}: no lab scope`);
          return notification;
        }

        const targetedUsers = await User.find(roleQuery).select('email');
        recipientEmails = targetedUsers.map((u) => u.email).filter(Boolean);
      }

      if (
        payload.metadata?.triggeredByEmail &&
        !recipientEmails.includes(payload.metadata.triggeredByEmail)
      ) {
        recipientEmails.push(payload.metadata.triggeredByEmail);
      }

      if (recipientEmails.length === 0 && GLOBAL_TYPES.has(payload.type)) {
        recipientEmails = [process.env.EMAIL_USER].filter(Boolean);
      }

      if (recipientEmails.length > 0) {
        const emailHtml = formatNotificationEmail(payload);

        (async () => {
          let anySuccess = false;
          let lastError = null;

          for (const email of recipientEmails) {
            console.log(`[Email] Sending [${payload.type}] "${payload.title}" → ${email} (lab=${resolvedLab})`);
            const emailResult = await sendEmail(email, `[CIMS ALERT] ${payload.title}`, emailHtml);
            if (emailResult.success) {
              anySuccess = true;
            } else {
              lastError = emailResult.error?.message;
            }
          }

          try {
            if (anySuccess) {
              notification.channels.push({ type: 'email', isSent: true, sentAt: new Date() });
            } else if (lastError) {
              notification.channels.push({ type: 'email', isSent: false, error: lastError });
            }
            await notification.save();
          } catch (err) {
            console.error('Failed to update notification channels:', err);
          }
        })().catch(console.error);
      }
    }

    if (payload.severity === 'critical') {
      const smsMessage = `[CIMS CRITICAL] ${payload.title}: ${payload.message}`;
      (async () => {
        try {
          await sendSMS(null, smsMessage);
          notification.channels.push({ type: 'sms', isSent: true, sentAt: new Date() });
          await notification.save();
        } catch (err) {
          console.error('Failed to send SMS or update notification channels:', err);
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
    // Stamp with user's active lab when known so lab-scoped Admins can see it
    lab: user?.active_lab || null,
    metadata: {
      ipAddress: ip,
      device: device,
      attemptedAction: action,
      triggeredByEmail: user?.email,
      triggeredByName: user?.name
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




