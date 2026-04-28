const mongoose = require('mongoose');
const path = require('path');
const Container = require('../models/Container');
const Chemical = require('../models/Chemical');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkAcetone() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const chem = await Chemical.findOne({ name: /Acetone/i });
    if (!chem) {
      console.log('Acetone not found in Chemical collection');
      return;
    }
    console.log('Chemical:', { id: chem.id, name: chem.name, status: chem.status, quantity: chem.quantity });
    
    const containers = await Container.find({ chemical_id: chem.id });
    console.log('Containers:', containers.map(c => ({ 
      id: c.container_id, 
      status: c.status, 
      expiry: c.expiry_date, 
      qty: c.quantity 
    })));
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkAcetone();
