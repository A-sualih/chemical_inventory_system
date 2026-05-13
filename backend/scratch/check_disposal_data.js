const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const WasteDisposal = require('./backend/src/models/WasteDisposal');
const Chemical = require('./backend/src/models/Chemical');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory');
    console.log('Connected to MongoDB');

    const recentDisposals = await WasteDisposal.find().sort({ createdAt: -1 }).limit(5);
    
    if (recentDisposals.length === 0) {
      console.log('No disposal records found.');
    } else {
      console.log(`\n--- Recent Disposal Records (${recentDisposals.length}) ---`);
      recentDisposals.forEach(d => {
        console.log(`\nID: ${d.disposal_id}`);
        console.log(`Chemical: ${d.chemical_name}`);
        console.log(`Status: ${d.status}`);
        console.log(`Method: ${d.method}`);
        
        if (d.method === 'Neutralization') {
          console.log('Neutralization Details:', d.method_details?.neutralization);
        } else if (d.method === 'Incineration') {
          console.log('Incineration Details:', d.method_details?.incineration);
        }
        
        console.log('General Details:', {
          operator: d.method_details?.operator_name,
          facility: d.method_details?.facility_name,
          treatment: d.method_details?.treatment_details,
          outcome: d.method_details?.verification_outcome
        });
      });
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkData();
