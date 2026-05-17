const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Container = require('../src/models/Container');

async function listAllContainers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const containers = await Container.find().limit(50);
    console.log(`Found ${containers.length} containers:`);
    containers.forEach(c => {
      console.log(`- ID: ${c.container_id}, ChemID: ${c.chemical_id}, Qty: ${c.quantity}, Status: ${c.status}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listAllContainers();

