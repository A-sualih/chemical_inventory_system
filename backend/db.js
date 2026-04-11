const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// We'll import models here for seeding, but they are also exported from their files
const User = require('./models/User');

const uri = process.env.MONGODB_URI;

async function initDb() {
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Successfully connected to MongoDB.');

    // Seed default admin user
    const adminExists = await User.findOne({ email: 'admin@lab.com' });
    if (!adminExists) {
      console.log('Seeding default admin user...');
      const hash = await bcrypt.hash('admin123', 10);
      const admin = new User({
        name: 'System Admin',
        email: 'admin@lab.com',
        password: hash,
        role: 'Admin'
      });
      await admin.save();
      console.log('Default admin user created: admin@lab.com / admin123');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

module.exports = {
  initDb
};
