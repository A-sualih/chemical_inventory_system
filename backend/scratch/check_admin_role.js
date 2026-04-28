const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const email = 'chemicalinventorysystem@gmail.com';
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (user) {
      console.log(`User: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Permissions: ${user.permissions || 'N/A'}`);
    } else {
      console.log('User not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
