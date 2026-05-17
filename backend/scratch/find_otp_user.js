const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function findOtpUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ otp: '7cqw3q' });
    if (user) {
      console.log(`Found user with OTP 7cqw3q: ${user.email}`);
    } else {
      console.log(`No user found with OTP 7cqw3q.`);
    }
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

findOtpUser();

