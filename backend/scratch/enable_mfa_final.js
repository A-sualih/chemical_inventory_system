const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function enableMfa() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = 'chemicalinventorysystem@gmail.com';
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    
    if (user) {
      user.mfa_enabled = true;
      user.mfa_type = 'email';
      await user.save();
      console.log('MFA has been RE-ENABLED for the admin account.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

enableMfa();
