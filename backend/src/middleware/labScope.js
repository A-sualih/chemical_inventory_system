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

    // Non-admin with no lab set: reject with 403
    if (!activeLab) {
      if (req.user.role === 'Admin') {
        req.labScope = { lab: null };
        req.activeLabId = null;
        return next();
      }
      return res.status(403).json({ 
        message: 'Access Denied: You must have an active laboratory selected to access this module.',
        code: 'NO_ACTIVE_LAB'
      });
    }

    // Auto-Rescue Logic: If user is in an unauthorized lab, move them to one they HAVE access to
    if (activeLab) {
      const allowedLabs = (dbUser.labs || []).map(id => id.toString());
      if (!allowedLabs.includes(activeLab.toString())) {
        if (allowedLabs.length > 0) {
          // Auto-switch to the first authorized lab
          const rescueLab = allowedLabs[0];
          await User.findByIdAndUpdate(dbUser._id, { active_lab: rescueLab });
          
          console.warn(`User ${dbUser._id} auto-rescued from restricted lab to: ${rescueLab}`);
          
          req.activeLabId = rescueLab;
          req.labScope = { lab: rescueLab };
          return next();
        } else {
          // Truly no access to any lab
          return res.status(403).json({ 
            message: 'Access Denied: You are not assigned to any laboratories. Please contact your administrator.',
            code: 'NO_LABS_ASSIGNED'
          });
        }
      }
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
