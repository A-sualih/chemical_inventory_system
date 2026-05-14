const Lab = require('../../models/Lab');
const User = require('../../models/User');
const Chemical = require('../../models/Chemical');
const Batch = require('../../models/Batch');
const Container = require('../../models/Container');
const Request = require('../../models/Request');
const AuditLog = require('../../models/AuditLog');
const Location = require('../../models/Location');
const Disposal = require('../../models/Disposal');
const WasteDisposal = require('../../models/WasteDisposal');
const InventoryLog = require('../../models/InventoryLog');
const Notification = require('../../models/Notification');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../middleware/authMiddleware');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../../config/roles');

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
    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const canManageLabs = userPermissions.includes(PERMISSIONS.MANAGE_LABS);
    const { all } = req.query;
    let labs;

    if (all === 'true' && canManageLabs) {
      // Admins/Managers specifically requesting full list (e.g. for Management UI)
      labs = await Lab.find().sort({ name: 1 });
    } else {
      // Standard view: Only show labs the user is assigned to
      // Fetch user to get latest assignments
      const user = await User.findById(req.user.id).select('labs role');
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      const query = { _id: { $in: user.labs || [] } };
      labs = await Lab.find(query).sort({ name: 1 });
    }
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
    const activeLabStr = String(targetUser.active_lab || '');
    const labIdsStr = (labs || []).map(String);

    if (labs && labs.length > 0 && !labIdsStr.includes(activeLabStr)) {
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

// Admin cascading delete lab
exports.deleteLab = async (req, res) => {
  try {
    const labId = req.params.id;
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admins can delete laboratories.' });
    }

    const lab = await Lab.findById(labId);
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    // Step 1: Remove the lab from all users' assignments
    const usersWithLab = await User.find({ labs: labId });
    for (let u of usersWithLab) {
      u.labs = u.labs.filter(id => String(id) !== String(labId));
      if (String(u.active_lab) === String(labId)) {
        u.active_lab = u.labs.length > 0 ? u.labs[0] : null;
      }
      await u.save();
    }

    // Step 2: Delete all records inherently tied to this Lab ID.
    // Order doesn't strictly matter for flat un-referenced deletion, but we do it systematically.
    await Chemical.deleteMany({ lab: labId });
    await Batch.deleteMany({ lab: labId });
    await Container.deleteMany({ lab: labId });
    await Request.deleteMany({ lab: labId });
    await Location.deleteMany({ lab: labId });
    await Disposal.deleteMany({ lab: labId });
    await WasteDisposal.deleteMany({ lab: labId });
    await InventoryLog.deleteMany({ lab: labId });
    await Notification.deleteMany({ lab: labId });
    await AuditLog.deleteMany({ lab: labId });

    // Ensure cross-lab transfer history referencing this lab as source or destination is also purged?
    // Actually, transfer history might be audited, but let's clear it to keep database clean.
    const TransferRequest = require('../../models/TransferRequest');
    if (TransferRequest) {
      await TransferRequest.deleteMany({ $or: [{ source_lab: labId }, { destination_lab: labId }] });
    }

    // Final Step: Delete the Lab
    await Lab.findByIdAndDelete(labId);

    res.status(200).json({ message: 'Laboratory and all associated data permanently deleted.', active_lab_reset: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
