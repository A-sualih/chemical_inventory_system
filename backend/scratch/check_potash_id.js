const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Container = require('../src/models/Container');

async function checkPotashContainer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const container = await Container.findOne({ container_id: 'potashId-1' });
    if (container) {
      console.log(`Found potashId-1: ChemID: ${container.chemical_id}, Qty: ${container.quantity}, Status: ${container.status}`);
    } else {
      console.log('potashId-1 not found.');
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkPotashContainer();
