const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');

async function listPotassium() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const chemicals = await Chemical.find({ name: /Potassium/i });
    console.log(`Found ${chemicals.length} chemicals:`);
    chemicals.forEach(c => {
      console.log(`- ${c.name} (${c.id}): ${c.quantity} ${c.unit} (Threshold: ${c.threshold})`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listPotassium();
