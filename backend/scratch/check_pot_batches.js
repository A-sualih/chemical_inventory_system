const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Batch = require('../src/models/Batch');

async function checkPotBatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const batches = await Batch.find({ chemical_id: { $in: ['C014', 'C015', 'C016', 'C017', 'C018', 'C019', 'C020'] } });
    console.log(`Found ${batches.length} batches for Potassium.`);
    batches.forEach(b => {
      console.log(`- Batch: ${b.batch_number}, ChemID: ${b.chemical_id}, Qty: ${b.total_quantity}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkPotBatches();

