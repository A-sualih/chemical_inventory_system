const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');
const Batch = require('../src/models/Batch');
const Container = require('../src/models/Container');

async function backfill() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const chemicals = await Chemical.find({ lab: { $exists: true, $ne: null } });
    console.log(`Found ${chemicals.length} chemicals with a lab assigned.`);

    let batchCount = 0;
    let containerCount = 0;

    for (const chem of chemicals) {
      // Update batches
      const batchUpdate = await Batch.updateMany(
        { chemical_id: chem.id, lab: null },
        { $set: { lab: chem.lab } }
      );
      batchCount += batchUpdate.modifiedCount;

      // Update containers
      const containerUpdate = await Container.updateMany(
        { chemical_id: chem.id, lab: null },
        { $set: { lab: chem.lab } }
      );
      containerCount += containerUpdate.modifiedCount;
    }

    console.log(`Successfully backfilled ${batchCount} batches and ${containerCount} containers.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  }
}

backfill();

