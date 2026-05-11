const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const InventoryLog = require('../src/models/InventoryLog');

async function checkPotassiumLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await InventoryLog.find({ chemical_name: /Potassium/i }).sort({ createdAt: 1 });
    console.log(`Found ${logs.length} logs:`);
    logs.forEach(l => {
      console.log(`[${l.createdAt.toISOString()}] ${l.action} - ${l.chemical_id} (${l.chemical_name}): ${l.quantity_change} ${l.unit}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkPotassiumLogs();
