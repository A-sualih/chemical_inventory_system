const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('../models/User');

const MONGODB_URI = 'mongodb+srv://Chemical:Chemical123@chemical.xfmpuwe.mongodb.net/chemical_inventory?retryWrites=true&w=majority';

const NEW_ADMIN_EMAIL = 'chemicalinventorysystem@gmail.com';
const NEW_ADMIN_PASSWORD = 'Ahmed&Sualih388';

async function setupFinalAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected.');

    // 1. Create or Update the new primary admin
    let primaryAdmin = await User.findOne({ email: new RegExp(`^${NEW_ADMIN_EMAIL}$`, 'i') });
    const hash = await bcrypt.hash(NEW_ADMIN_PASSWORD, 10);

    if (primaryAdmin) {
      console.log(`Promoting/Updating existing user: ${primaryAdmin.email}`);
      primaryAdmin.password = hash;
      primaryAdmin.role = 'Admin';
      primaryAdmin.mfa_enabled = false; // Disable MFA for initial access
      await primaryAdmin.save();
    } else {
      console.log(`Creating NEW primary admin: ${NEW_ADMIN_EMAIL}`);
      primaryAdmin = new User({
        name: 'Chemical Inventory Admin',
        email: NEW_ADMIN_EMAIL,
        password: hash,
        role: 'Admin',
        mfa_enabled: false
      });
      await primaryAdmin.save();
    }
    console.log('Primary admin setup COMPLETE.');

    // 2. Remove all OTHER admins
    const result = await User.deleteMany({
      role: 'Admin',
      email: { $ne: NEW_ADMIN_EMAIL }
    });

    console.log(`Removed ${result.deletedCount} other admin accounts.`);

    // Safety check: confirm admin@lab.com is gone if it was an admin
    const oldAdmin = await User.findOne({ email: 'admin@lab.com' });
    if (oldAdmin && oldAdmin.role === 'Admin') {
      console.log('Warning: admin@lab.com still exists as admin. Deleting it now...');
      await User.deleteOne({ email: 'admin@lab.com' });
    }

  } catch (err) {
    console.error('Operation FAILED:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

setupFinalAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
