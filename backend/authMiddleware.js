const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super_secret_jwt_key_for_cims'; 

const { ROLES, ROLE_PERMISSIONS } = require('./config/roles');
const AuditLog = require('./models/AuditLog');

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
      return res.status(403).json({ error: `Forbidden: Missing permission [${permission}]` });
    }
    next();
  };
}

/**
 * Utility to log user actions to AuditLog
 */
async function logAudit(req, action, details, resource, resource_id) {
  try {
    const auditData = {
      user_id: req.user ? req.user.id : null,
      user_email: req.user ? req.user.email : 'System/Anonymous',
      action,
      details,
      resource,
      resource_id,
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    };
    await AuditLog.create(auditData);
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

module.exports = { authenticate, authorize, logAudit, JWT_SECRET, ROLES };

