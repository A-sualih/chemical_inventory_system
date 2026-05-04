const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_cims';

const { ROLES, ROLE_PERMISSIONS } = require('../config/roles');
const AuditLog = require('../models/AuditLog');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', expired: true });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware to check if user has a specific permission
 */
function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      const { notifyUnauthorizedAccess } = require('../services/notificationService');
      notifyUnauthorizedAccess(req.user, `Attempted restricted action: ${permission}`, req.ip, req.headers['user-agent']).catch(console.error);
      return res.status(403).json({ error: `Forbidden: Missing permission [${permission}]` });
    }
    next();

  };
}

/**
 * Utility to log user actions to AuditLog
 */
async function logAudit(req, { action, targetType, targetId, targetName, details, oldValue, newValue, status = 'success' }) {
  try {
    const auditData = {
      user: {
        id: req.user ? req.user.id : null,
        name: req.user ? req.user.name : 'System/Anonymous',
        role: req.user ? req.user.role : 'N/A',
        email: req.user ? req.user.email : null
      },
      action: action.toUpperCase(),
      target: {
        type: targetType.toLowerCase(),
        id: String(targetId || ''),
        name: targetName
      },
      details,
      changes: (oldValue || newValue) ? { oldValue, newValue } : undefined,
      metadata: {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status
      }
    };
    await AuditLog.create(auditData);
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

module.exports = { authenticate, authorize, logAudit, JWT_SECRET, ROLES };



