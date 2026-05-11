const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');

async function fixPotassiumSeries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const chemicals = await Chemical.find({ name: /Potassium/i });
    
    for (const chem of chemicals) {
      const newSeries = `potash-${chem.id}`;
      console.log(`Updating ${chem.name} (${chem.id}) series to ${newSeries}`);
      chem.container_id_series = newSeries;
      await chem.save();
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

fixPotassiumSeries();
