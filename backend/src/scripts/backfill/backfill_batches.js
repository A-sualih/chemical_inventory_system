const mongoose = require('mongoose');
const Chemical = require('../../models/Chemical');
const Batch = require('../../models/Batch');
require('dotenv').config();

const backfillBatches = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory');
    console.log("Connected to MongoDB...");

    const chemicals = await Chemical.find({ batch_number: { $exists: true, $ne: "" } });
    console.log(`Found ${chemicals.length} chemicals with batch numbers.`);

    for (const chem of chemicals) {
      const batchData = {
        batch_number: chem.batch_number,
        chemical_id: chem.id,
        total_quantity: chem.quantity,
        unit: chem.unit,
        manufacturing_date: chem.manufacturing_date,
        expiry_date: chem.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1yr if missing
        supplier_name: chem.supplier,
        building: chem.building,
        room: chem.room,
        cabinet: chem.cabinet,
        shelf: chem.shelf,
        status: 'Active'
      };

      // Determine status
      if (batchData.expiry_date) {
        const diff = (new Date(batchData.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
        if (diff < 0) batchData.status = 'Expired';
        else if (diff < 30) batchData.status = 'Near Expiry';
      }

      await Batch.findOneAndUpdate(
        { batch_number: chem.batch_number },
        { $set: batchData },
        { upsert: true }
      );
      console.log(`Synced batch ${chem.batch_number} for ${chem.name}`);
    }

    console.log("Backfill complete.");
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
};

backfillBatches();



