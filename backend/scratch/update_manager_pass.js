const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function updatePassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'abushe1367@gmail.com';
    const newPass = 'Ahmed&Sualih388';

    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) {
      console.log(`User not found: ${email}`);
    } else {
      const hash = await bcrypt.hash(newPass, 10);
      user.password = hash;
      user.mfa_enabled = false; // Disable MFA for easy login testing
      await user.save();
      console.log(`Password successfully updated for ${email} to ${newPass} (MFA disabled).`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

updatePassword();
