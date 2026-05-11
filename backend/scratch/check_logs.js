const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const InventoryLog = require('../src/models/InventoryLog');

async function checkLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await InventoryLog.find({ chemical_name: /Nitric Acid/i }).sort({ createdAt: -1 }).limit(5);
    console.log(`Recent logs for Nitric Acid:`);
    logs.forEach(l => {
      console.log(`[${l.createdAt.toISOString()}] ${l.action} - Change: ${l.quantity_change} ${l.unit}, Reason: ${l.reason}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkLogs();
