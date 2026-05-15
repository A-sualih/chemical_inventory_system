const mongoose = require('mongoose');
const AuditLog = require('../src/models/AuditLog');
require('dotenv').config();

async function checkAuditLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await AuditLog.find({ 'user.email': 'ahmedmuhammed026y@gmail.com' })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`Recent audit logs for ahmedmuhammed026y@gmail.com:`);
    logs.forEach(l => {
      console.log(`[${l.createdAt.toISOString()}] ${l.action} - ${l.details}`);
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkAuditLogs();
