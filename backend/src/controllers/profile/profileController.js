const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, profile_photo, email_preferences, mfa_enabled } = req.body;
    
    // Find the current user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const trackedChanges = {};

    // Update allowable fields
    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'Email already in use' });
      trackedChanges.email = { old: user.email, new: email };
      user.email = email;
    }
    if (name !== undefined) {
      if (user.name !== name) trackedChanges.name = { old: user.name, new: name };
      user.name = name;
    }
    if (phone !== undefined) user.phone = phone;
    if (profile_photo !== undefined) {
      if (user.profile_photo !== profile_photo) trackedChanges.profile_photo = { old: user.profile_photo, new: profile_photo };
      user.profile_photo = profile_photo;
    }
    if (email_preferences !== undefined) user.email_preferences = email_preferences;
    if (mfa_enabled !== undefined) user.mfa_enabled = mfa_enabled;

    await user.save();
    
    // Log sensitive profile state transitions for the auditor
    if (Object.keys(trackedChanges).length > 0) {
      await AuditLog.create({
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email
        },
        action: 'UPDATE',
        target: {
          type: 'user',
          id: user._id.toString(),
          name: user.name
        },
        details: 'User updated sensitive profile properties',
        changes: {
          oldValue: Object.keys(trackedChanges).reduce((acc, key) => ({ ...acc, [key]: trackedChanges[key].old }), {}),
          newValue: Object.keys(trackedChanges).reduce((acc, key) => ({ ...acc, [key]: trackedChanges[key].new }), {})
        },
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    }

    res.json({ message: 'Profile updated successfully', user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile_photo: user.profile_photo,
      email_preferences: user.email_preferences,
      mfa_enabled: user.mfa_enabled
    }});
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

