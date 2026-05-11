const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Container = require('../src/models/Container');
const Chemical = require('../src/models/Chemical');

async function findOrphanContainers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const potIDs = (await Chemical.find({ name: /Potassium/i })).map(c => c.id);
    console.log('Potassium IDs:', potIDs);

    const containers = await Container.find({ chemical_id: { $in: potIDs } });
    console.log(`Found ${containers.length} containers for these IDs.`);

    // Check all containers for any mention of potassium
    const allContainers = await Container.find();
    for (const c of allContainers) {
      const chem = await Chemical.findOne({ id: c.chemical_id });
      if (chem && chem.name.toLowerCase().includes('potassium')) {
        console.log(`FOUND: Container ${c.container_id} is linked to ${chem.name} (${chem.id})`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

findOrphanContainers();
