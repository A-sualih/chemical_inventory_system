const mongoose = require('mongoose');
const path = require('path');
const Chemical = require('../models/Chemical');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkArchivedField() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Chemical.countDocuments({});
    const withArchivedFalse = await Chemical.countDocuments({ archived: false });
    const withArchivedTrue = await Chemical.countDocuments({ archived: true });
    const missingArchived = await Chemical.countDocuments({ archived: { $exists: false } });
    
    console.log('Total Chemicals:', count);
    console.log('Archived False:', withArchivedFalse);
    console.log('Archived True:', withArchivedTrue);
    console.log('Missing Archived Field:', missingArchived);
    
    if (missingArchived > 0) {
      console.log('Fixing missing archived fields...');
      await Chemical.updateMany({ archived: { $exists: false } }, { $set: { archived: false } });
      console.log('Fix complete.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkArchivedField();
