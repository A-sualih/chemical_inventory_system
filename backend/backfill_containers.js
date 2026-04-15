const mongoose = require('mongoose');
const Chemical = require('./models/Chemical');
const Container = require('./models/Container');
require('dotenv').config();

const backfillContainers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory');
    console.log("Connected to MongoDB for Container backfill...");

    const chemicals = await Chemical.find();
    console.log(`Found ${chemicals.length} chemicals to process.`);

    for (const chem of chemicals) {
      const numContainers = chem.num_containers || 1;
      const baseId = chem.container_id_series || chem.id || 'CONT';
      const qtyPer = chem.quantity_per_container || (chem.quantity / numContainers) || 0;

      for (let i = 1; i <= numContainers; i++) {
        const containerId = numContainers > 1 ? `${baseId}-${i}` : baseId;
        
        const containerData = {
          container_id: containerId,
          chemical_id: chem.id,
          quantity: qtyPer,
          unit: chem.unit,
          batch_number: chem.batch_number,
          building: chem.building,
          room: chem.room,
          cabinet: chem.cabinet,
          shelf: chem.shelf,
          manufacturing_date: chem.manufacturing_date,
          expiry_date: chem.expiry_date,
          container_type: chem.container_type || 'Plastic bottle',
          status: 'Full'
        };

        // Determine status
        if (containerData.expiry_date) {
            const exp = new Date(containerData.expiry_date);
            const now = new Date();
            const diff = (exp - now) / (1000 * 60 * 60 * 24);
            if (diff < 0) containerData.status = 'Expired';
            else if (diff < 30) containerData.status = 'Near Expiry';
        }

        await Container.findOneAndUpdate(
          { container_id: containerId },
          { $set: containerData },
          { upsert: true }
        );
      }
      console.log(`Synced containers for ${chem.name}`);
    }

    console.log("Container backfill complete.");
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
};

backfillContainers();
