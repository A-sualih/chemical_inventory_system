const Lab = require('../../models/Lab');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../middleware/authMiddleware');

exports.createLab = async (req, res) => {
  try {
    const lab = new Lab(req.body);
    await lab.save();
    res.status(201).json(lab);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getLabs = async (req, res) => {
  try {
    const labs = await Lab.find();
    res.status(200).json(labs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLab = async (req, res) => {
  try {
    const lab = await Lab.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lab) return res.status(404).json({ message: 'Lab not found' });
    res.status(200).json(lab);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.switchActiveLab = async (req, res) => {
  try {
    const { labId } = req.body;
    const lab = await Lab.findById(labId);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });
    
    // Admin can switch to any lab; regular users must be assigned
    if (req.user.role !== 'Admin') {
      const userRecord = await User.findById(req.user.id);
      const labIds = (userRecord.labs || []).map(String);
      if (!labIds.includes(String(labId))) {
        return res.status(403).json({ message: 'You do not have access to this lab' });
      }
    }
    
    const userToUpdate = await User.findById(req.user.id);
    userToUpdate.active_lab = labId;
    await userToUpdate.save();
    
    // Issue a NEW token so the frontend's state is consistent
    const newToken = jwt.sign(
      { id: userToUpdate._id, role: userToUpdate.role, name: userToUpdate.name, email: userToUpdate.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.status(200).json({
      message: 'Active lab switched successfully',
      token: newToken,
      user: { 
        id: userToUpdate._id, 
        name: userToUpdate.name, 
        email: userToUpdate.email, 
        role: userToUpdate.role, 
        active_lab: userToUpdate.active_lab,
        labs: userToUpdate.labs
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin assigning users to lab
exports.assignUser = async (req, res) => {
  try {
    const { userId, labs } = req.body; // labs is array of lab IDs
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    targetUser.labs = labs;
    if (labs && labs.length > 0 && !labs.includes(targetUser.active_lab)) {
      targetUser.active_lab = labs[0];
    } else if (!labs || labs.length === 0) {
      targetUser.active_lab = null;
    }
    await targetUser.save();
    res.status(200).json({ message: 'User labs updated', user: targetUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
