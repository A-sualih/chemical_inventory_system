const mongoose = require('mongoose');
const Chemical = require('../src/models/Chemical');
const Container = require('../src/models/Container');
require('dotenv').config();

async function createNitricContainer() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const nitric = await Chemical.findOne({ name: /Nitric Acid/i });
  if (nitric) {
    const existing = await Container.findOne({ container_id: 'NITRIC-TEST-001' });
    if (!existing) {
      await Container.create({
        container_id: 'NITRIC-TEST-001',
        chemical_id: nitric._id,
        quantity: 500,
        unit: 'mL',
        status: 'In Use',
        location: 'Safety Cabinet A-1',
        building: 'Science Hall',
        room: 'Lab 302'
      });
      console.log('Created container: NITRIC-TEST-001');
    } else {
      console.log('Container NITRIC-TEST-001 already exists');
    }
  } else {
    console.log('Nitric Acid chemical not found');
  }
  await mongoose.disconnect();
}

createNitricContainer().catch(console.error);
