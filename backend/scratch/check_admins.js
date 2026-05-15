const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function checkAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admins = await User.find({ role: 'Admin' });
    console.log(`Admins:`);
    admins.forEach(a => {
      console.log(` - ${a.email} (MFA: ${a.mfa_enabled}, OTP: ${a.otp})`);
    });
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkAdmins();
