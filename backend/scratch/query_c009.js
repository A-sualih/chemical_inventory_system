const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Container = require('./src/models/Container');
  const Chemical = require('./src/models/Chemical');

  const chemical = await Chemical.findOne({ id: 'C009' });
  console.log("Chemical:", chemical ? { id: chemical.id, name: chemical.name, _id: chemical._id } : "Not Found");

  if (chemical) {
    const containers = await Container.find({ 
      chemical_id: { $in: [chemical.id, chemical._id.toString()] } 
    });
    console.log("Containers for C009:", containers.map(c => ({
      id: c.container_id,
      chem_id: c.chemical_id,
      status: c.status,
      qty: c.quantity
    })));
  }

  process.exit(0);
});
