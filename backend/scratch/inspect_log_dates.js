const mongoose = require('mongoose');
const path = require('path');
const InventoryLog = require('../models/InventoryLog');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspectLogDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await InventoryLog.find({});
    console.log(`Found ${logs.length} logs.`);
    logs.forEach(l => {
      console.log(`- ${l.action} at ${l.createdAt}`);
    });
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    console.log(`One month ago was: ${oneMonthAgo}`);
    
    const count = await InventoryLog.countDocuments({
      action: 'OUT',
      createdAt: { $gte: oneMonthAgo }
    });
    console.log(`Logs in last month: ${count}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

inspectLogDates();
