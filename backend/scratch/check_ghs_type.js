const mongoose = require('mongoose');
const path = require('path');
const Chemical = require('../models/Chemical');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkGhsType() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const chemicals = await Chemical.find({ archived: false });
    chemicals.forEach(c => {
      console.log(`${c.name}: ghs_classes type = ${typeof c.ghs_classes}, value = ${JSON.stringify(c.ghs_classes)}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkGhsType();
