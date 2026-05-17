const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function findSimilarUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ email: /ahmedmuhammed/i });
    console.log(`Found ${users.length} users matching 'ahmedmuhammed':`);
    users.forEach(u => {
      console.log(` - ${u.email} (MFA: ${u.mfa_enabled}, Type: ${u.mfa_type}, OTP: ${u.otp})`);
    });
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

findSimilarUsers();

