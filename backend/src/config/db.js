const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// We'll import models here for seeding, but they are also exported from their files
const User = require('../models/User');

const uri = process.env.MONGODB_URI;

async function initDb() {
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of default 30s
    });
    console.log('Successfully connected to MongoDB Cluster.');

    // Seed primary admin user
    const adminExists = await User.findOne({ email: 'chemicalinventorysystem@gmail.com' });
    if (!adminExists) {
      console.log('Seeding primary admin user...');
      const hash = await bcrypt.hash('Ahmed&Sualih388', 10);
      const admin = new User({
        name: 'Chemical Inventory Admin',
        email: 'chemicalinventorysystem@gmail.com',
        password: hash,
        role: 'Admin',
        mfa_enabled: false
      });
      await admin.save();
      console.log('Primary admin user created: chemicalinventorysystem@gmail.com');
    }
  } catch (err) {
    console.error('MongoDB connection error details:');
    console.error(`- Message: ${err.message}`);
    console.error(`- Code: ${err.code}`);
    if (err.name === 'MongooseServerSelectionError') {
      console.error('TIP: Check if your current IP address is whitelisted in MongoDB Atlas Network Access.');
    }
    throw err;
  }
}

module.exports = {
  initDb
};


