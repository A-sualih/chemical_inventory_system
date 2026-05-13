const mongoose = require('mongoose');
const Chemical = require('../src/models/Chemical');
require('dotenv').config();

async function checkC013() {
  await mongoose.connect(process.env.MONGODB_URI);
  const c = await Chemical.findOne({ $or: [{ id: 'C013' }, { cas_number: 'C013' }] });
  console.log('Chemical C013:', c ? c.name : 'Not Found');
  await mongoose.disconnect();
}

checkC013().catch(console.error);
