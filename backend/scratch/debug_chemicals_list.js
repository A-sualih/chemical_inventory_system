const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');
const Lab = require('../src/models/Lab');

async function debugChemicals() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const chemicals = await Chemical.find().populate('lab');
    console.log(`Total Chemicals found: ${chemicals.length}`);
    
    chemicals.slice(0, 10).forEach((c, index) => {
      console.log(`[${index}] Name: ${c.name}, ID: ${c.id}, Lab: ${c.lab ? c.lab.name : 'No Lab Assigned'}, Archived: ${c.archived}`);
    });

    const labs = await Lab.find();
    console.log(`\nTotal Labs found: ${labs.length}`);
    labs.forEach(l => console.log(`Lab: ${l.name}, ID: ${l._id}`));

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

debugChemicals();

