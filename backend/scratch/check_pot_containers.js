const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Container = require('../src/models/Container');
const Chemical = require('../src/models/Chemical');

async function checkPotassiumContainers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const chemicals = await Chemical.find({ name: /Potassium/i });
    console.log(`Found ${chemicals.length} Potassium chemical records.`);

    for (const chem of chemicals) {
      const containers = await Container.find({ chemical_id: chem.id });
      console.log(`\n--- Chemical: ${chem.name} (${chem.id}) ---`);
      console.log(`Total Qty in Chemical: ${chem.quantity} ${chem.unit}`);
      console.log(`Containers found: ${containers.length}`);
      
      containers.forEach(c => {
        console.log(`- ID: ${c.container_id}, Batch: ${c.batch_number}, Qty: ${c.quantity} ${c.unit}, Status: ${c.status}`);
        console.log(`  Location: ${c.location || 'N/A'} (Building: ${c.building}, Room: ${c.room}, Cab: ${c.cabinet}, Sh: ${c.shelf})`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkPotassiumContainers();
