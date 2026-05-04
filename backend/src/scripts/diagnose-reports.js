const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Chemical = require('../models/Chemical');

async function diagnose() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory';
  await mongoose.connect(mongoUri);
  console.log('Connected!\n');

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const threshold = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
  const cutoff = new Date(now.getTime() + (threshold + 1) * 24 * 60 * 60 * 1000);

  console.log('Now (normalized):', now.toISOString());
  console.log('Near Expiry Cutoff:', cutoff.toISOString());
  console.log('Threshold days:', threshold);
  console.log('---');

  const expiredCount = await Chemical.countDocuments({ archived: false, expiry_date: { $lt: now } });
  const nearExpiryCount = await Chemical.countDocuments({ archived: false, expiry_date: { $gte: now, $lte: cutoff } });
  const totalCount = await Chemical.countDocuments({ archived: false });

  console.log('Total chemicals (not archived):', totalCount);
  console.log('Expired count:', expiredCount);
  console.log('Near Expiry count:', nearExpiryCount);
  console.log('---');

  // Show the actual chemicals with their dates for debugging
  const expiredList = await Chemical.find({ archived: false, expiry_date: { $lt: now } }).select('name expiry_date status');
  const nearExpiryList = await Chemical.find({ archived: false, expiry_date: { $gte: now, $lte: cutoff } }).select('name expiry_date status');
  const allChems = await Chemical.find({}).select('name expiry_date status archived');

  console.log('\nExpired chemicals:');
  expiredList.forEach(c => console.log(` - ${c.name}: ${c.expiry_date} (status: ${c.status})`));

  console.log('\nNear Expiry chemicals:');
  nearExpiryList.forEach(c => console.log(` - ${c.name}: ${c.expiry_date} (status: ${c.status})`));

  console.log('\nALL chemicals (including archived):');
  allChems.forEach(c => console.log(` - ${c.name}: expiry=${c.expiry_date} status=${c.status} archived=${c.archived}`));

  process.exit(0);
}

diagnose().catch(err => { console.error(err); process.exit(1); });
