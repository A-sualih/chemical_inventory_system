const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'ahmedmuhammed026y@gmail.com';
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });

    if (!user) {
      console.log(`User with email ${email} not found.`);
      
      // List some users to see what's there
      const users = await User.find({}).limit(5);
      console.log('Sample users in DB:');
      users.forEach(u => console.log(` - ${u.email}`));
    } else {
      console.log('User found:');
      console.log(` - ID: ${user._id}`);
      console.log(` - Email: ${user.email}`);
      console.log(` - MFA Enabled: ${user.mfa_enabled}`);
      console.log(` - MFA Type: ${user.mfa_type}`);
      console.log(` - Status: ${user.status}`);
      console.log(` - Role: ${user.role}`);
      console.log(` - OTP: ${user.otp}`);
      console.log(` - OTP Expiry: ${user.otpExpiry}`);
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUser();
