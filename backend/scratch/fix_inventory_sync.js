const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');
const { syncContainers } = require('../src/services/containerService');
const { syncBatch } = require('../src/services/batchService');

async function fixInventorySync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const chemicals = await Chemical.find();
    console.log(`Syncing containers for ${chemicals.length} chemicals...`);

    for (const chem of chemicals) {
      console.log(`Syncing ${chem.name} (${chem.id})...`);
      
      // Ensure we have necessary data for sync
      const data = chem.toObject();
      data.id = chem.id; // Ensure string ID is passed
      
      if (chem.batch_number) {
        await syncBatch(data);
      }
      
      await syncContainers(data);
    }

    await mongoose.disconnect();
    console.log('Sync completed.');
  } catch (err) {
    console.error(err);
  }
}

fixInventorySync();

