const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const InventoryLog = require('../src/models/InventoryLog');

async function checkLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const logs = await InventoryLog.find({ reason: { $regex: /Quick Scan/i } });
    console.log(`Found ${logs.length} Quick Scan logs in the database.`);
    if (logs.length > 0) {
      console.log('Latest log:', logs[logs.length - 1]);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkLogs();
