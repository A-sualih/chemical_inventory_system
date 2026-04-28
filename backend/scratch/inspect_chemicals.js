const mongoose = require('mongoose');
const path = require('path');
const Chemical = require('../models/Chemical');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspectChemicals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const chemicals = await Chemical.find({ archived: false });
    console.log(`Found ${chemicals.length} active chemicals.`);
    chemicals.forEach(c => {
      console.log(`- ${c.name}: Status=${c.status}, GHS=${JSON.stringify(c.ghs_classes)}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

inspectChemicals();
