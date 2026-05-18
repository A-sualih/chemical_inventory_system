const mongoose = require('mongoose');
const path = require('path');
const Chemical = require('../src/models/Chemical');
const Container = require('../src/models/Container');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function queryC006() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const chemical = await Chemical.findOne({ id: 'C006' });
    console.log('Chemical C006:');
    console.log(JSON.stringify(chemical, null, 2));

    const containers = await Container.find({ chemical_id: { $in: ['C006', chemical?._id?.toString()] } });
    console.log('Containers for C006:');
    console.log(JSON.stringify(containers, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

queryC006();
