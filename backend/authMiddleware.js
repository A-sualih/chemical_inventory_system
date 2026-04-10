const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super_secret_jwt_key_for_cims'; 

const ROLES = {
  ADMIN: 'Admin',
  LAB_MANAGER: 'Lab Manager',
  LAB_TECHNICIAN: 'Lab Technician',
  SAFETY_OFFICER: 'Safety Officer',
  VIEWER: 'Viewer / Auditor'
};

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  }
}

module.exports = { authenticate, requireRole, JWT_SECRET, ROLES };

