const mongoose = require('mongoose');
require('dotenv').config();
const Supplier = require('../models/Supplier');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chemical_inventory').then(async () => {
  console.log('Connected to DB');
  const suppliers = await Supplier.find({});
  let fixed = 0;
  for (let s of suppliers) {
    let changed = false;
    if (s.contact_phone && !s.contact_phone.includes(':')) {
      s.contact_phone = s.contact_phone; // re-saving invokes setter which encrypts
      changed = true;
    }
    if (s.tax_vat_number && !s.tax_vat_number.includes(':')) {
      s.tax_vat_number = s.tax_vat_number; // re-saving invokes setter
      changed = true;
    }
    if (changed) {
      await s.save();
      fixed++;
    }
  }
  console.log(`Fixed ${fixed} suppliers`);
  process.exit(0);
}).catch(console.error);
