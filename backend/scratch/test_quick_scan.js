const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');
const InventoryLog = require('../src/models/InventoryLog');
const User = require('../src/models/User');
const Lab = require('../src/models/Lab');
const { convertToBase, convertFromBase } = require('../src/utils/unitConverter');

async function testQuickScan() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const admin = await User.findOne({ role: 'Admin' });
    const lab = await Lab.findOne();
    const chem = await Chemical.findOne();

    if (!chem) throw new Error("No chemical found");

    const qtyToChange = chem.quantity_per_container || 1;
    const txUnit = chem.unit;

    const log = new InventoryLog({ 
      lab: lab._id, 
      chemical_id: chem.id,
      chemical_name: chem.name,
      user_id: admin._id,
      user_name: admin.name,
      user_role: admin.role,
      action: 'IN',
      quantity_change: qtyToChange,
      unit: txUnit,
      reason: 'Quick Scan Check-In',
      batch_number: chem.batch_number,
      location: chem.location
    });
    
    await log.save();
    console.log('Log saved successfully', log);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testQuickScan();
