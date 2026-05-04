const mongoose = require('mongoose');
require('dotenv').config();

async function checkMfa() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('../../models/User');
    
    const users = await User.find({}, 'email mfa_enabled mfa_type');
    
    console.log("--- MFA STATUS FOR ALL USERS ---");
    users.forEach(u => {
      console.log(`Email: ${u.email} | MFA Enabled: ${u.mfa_enabled ? 'YES (' + u.mfa_type + ')' : 'NO'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkMfa();



