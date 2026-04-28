const mongoose = require('mongoose');
const path = require('path');
const InventoryLog = require('../models/InventoryLog');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspectLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await InventoryLog.find({});
    console.log(`Found ${logs.length} logs.`);
    logs.forEach(l => {
      console.log(`- ${l.action}: ${l.quantity_change} ${l.unit} for ${l.chemical_name}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

inspectLogs();
