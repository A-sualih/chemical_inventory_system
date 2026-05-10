const User = require('../../models/User');

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
    const { name, phone, profile_photo, email_preferences, mfa_enabled } = req.body;
    
    // Find the current user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowable fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (profile_photo !== undefined) user.profile_photo = profile_photo;
    if (email_preferences !== undefined) user.email_preferences = email_preferences;
    if (mfa_enabled !== undefined) user.mfa_enabled = mfa_enabled;

    await user.save();
    
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
