const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');
const Notification = require('../src/models/Notification');

async function checkPotassium() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const potassium = await Chemical.findOne({ name: /Potassium/i });
    if (!potassium) {
      console.log('Potassium not found.');
      return;
    }

    console.log(`--- Chemical: ${potassium.name} ---`);
    console.log(`Quantity: ${potassium.quantity} ${potassium.unit}`);
    console.log(`Threshold: ${potassium.threshold}`);
    
    const notifications = await Notification.find({ 
      'related.chemicalId': potassium.id,
      type: 'LOW_STOCK'
    }).sort({ createdAt: -1 });

    console.log(`Notifications found: ${notifications.length}`);
    notifications.forEach(n => {
      console.log(`[${n.createdAt.toISOString()}] ${n.title} - Status: ${n.status}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkPotassium();

