const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Chemical = require('../models/Chemical');

async function refreshData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);

    const chemicals = await Chemical.find({});
    console.log(`Processing ${chemicals.length} chemicals...`);

    let updatedCount = 0;
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const threshold = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;

    for (const chem of chemicals) {
      let needsSave = false;

      // 1. Fix expiry_date if it's a string that can be parsed
      if (chem.expiry_date && typeof chem.expiry_date === 'string') {
        chem.expiry_date = new Date(chem.expiry_date);
        needsSave = true;
      }

      // 2. Recalculate status
      if (chem.expiry_date) {
        const exp = new Date(chem.expiry_date);
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        
        let newStatus = chem.status;
        if (diff < 0) {
          newStatus = 'Expired';
        } else if (diff <= threshold) {
          newStatus = 'Near Expiry';
        } else {
          newStatus = chem.quantity <= 0 ? 'Out of Stock' : (chem.quantity < (chem.threshold || 5) ? 'Low Stock' : 'In Stock');
        }

        if (chem.status !== newStatus) {
          chem.status = newStatus;
          needsSave = true;
        }
      }

      if (needsSave) {
        await chem.save();
        updatedCount++;
      }
    }

    console.log(`✅ Success! Updated ${updatedCount} chemicals.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during refresh:', err);
    process.exit(1);
  }
}

refreshData();

