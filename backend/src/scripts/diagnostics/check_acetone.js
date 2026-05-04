const mongoose = require('mongoose');
require('dotenv').config();

async function checkAcetone() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Chemical = require('../../models/Chemical');
    const Container = require('../../models/Container');
    
    const acetone = await Chemical.findOne({ name: /Acetone/i });
    if (!acetone) {
      console.log("Acetone not found in DB.");
      process.exit(0);
    }
    
    console.log(`Acetone found: ID=${acetone.id}, Status=${acetone.status}, Expiry=${acetone.expiry_date}`);
    
    const containers = await Container.find({ chemical_id: acetone.id });
    console.log(`Containers for Acetone:`);
    containers.forEach(c => {
      console.log(`- ${c.container_id}: Status=${c.status}, Expiry=${c.expiry_date}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAcetone();



