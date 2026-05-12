const User = require('../models/User');
const mongoose = require('mongoose');

const requireLabScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not found attached to request' });
    }

    // Validate that req.user.id is a valid MongoDB ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(401).json({ message: 'Unauthorized: Invalid user identifier' });
    }

    // Always pull from DB to get the REAL current active_lab (JWT is stale after lab switch)
    const dbUser = await User.findById(req.user.id).select('active_lab labs role').lean();
    
    if (!dbUser) {
      return res.status(401).json({ message: 'Unauthorized: User not found in database' });
    }

    let activeLab = dbUser.active_lab || null;
    
    // Admin with no lab set: allow everything (global access)
    if (!activeLab && req.user.role === 'Admin') {
      req.labScope = { lab: null };
      req.activeLabId = null;
      return next();
    }

    // Non-admin with no lab set: still allow through with null scope
    // Controllers should handle null activeLabId gracefully
    if (!activeLab) {
      req.labScope = { lab: null };
      req.activeLabId = null;
      return next();
    }

    req.labScope = { lab: activeLab };
    req.activeLabId = activeLab;
    next();
  } catch (error) {
    console.error('LabScope Middleware Error:', error);
    res.status(500).json({ message: 'Internal Server Error enforcing lab scope' });
  }
};

module.exports = {
  requireLabScope
};
