const mongoose = require('mongoose');
const path = require('path');
const Chemical = require('../models/Chemical');
const InventoryLog = require('../models/InventoryLog');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const total = await Chemical.countDocuments({});
    const active = await Chemical.countDocuments({ archived: false });
    const archived = await Chemical.countDocuments({ archived: true });
    const logs = await InventoryLog.countDocuments({});
    
    console.log('Total Chemicals:', total);
    console.log('Active Chemicals:', active);
    console.log('Archived Chemicals:', archived);
    console.log('Inventory Logs:', logs);

    if (active > 0) {
      const sample = await Chemical.findOne({ archived: false });
      console.log('Sample Chemical Status:', sample.status);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();
