const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/abushe/abushe/chemical_inventory_system/backend/.env' });
const { getWasteAnalytics } = require('./src/controllers/waste/wasteController');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const req = {}; // Mock req
    const res = {
      json: (data) => console.log('SUCCESS:', data),
      status: (code) => ({ json: (err) => console.log('ERROR:', code, err) })
    };
    await getWasteAnalytics(req, res);
  } catch(e) {
    console.error(e);
  }
  process.exit();
});

