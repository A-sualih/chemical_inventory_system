const mongoose = require('mongoose');
const path = require('path');
const Chemical = require('../models/Chemical');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkExpiredStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const now = new Date();
    
    const chemicals = await Chemical.find({ archived: false });
    console.log('--- Checking Chemicals Expiry ---');
    
    for (let chem of chemicals) {
      const isExpired = chem.expiry_date && new Date(chem.expiry_date) < now;
      console.log(`${chem.name} (${chem.id}): Expiry=${chem.expiry_date}, Status=${chem.status}, IsActuallyExpired=${isExpired}`);
      
      if (isExpired && chem.status !== 'Expired') {
        console.log(`Updating ${chem.name} to Expired status...`);
        chem.status = 'Expired';
        await chem.save();
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkExpiredStatus();
