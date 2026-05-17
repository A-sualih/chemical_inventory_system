const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');
const Notification = require('../src/models/Notification');

async function checkNitricAcid() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const nitricAcid = await Chemical.findOne({ name: /Nitric Acid/i });
    if (!nitricAcid) {
      console.log('Nitric Acid not found in inventory.');
      return;
    }

    console.log('--- Chemical Info ---');
    console.log(`Name: ${nitricAcid.name}`);
    console.log(`ID: ${nitricAcid.id}`);
    console.log(`Quantity: ${nitricAcid.quantity} ${nitricAcid.unit}`);
    console.log(`Threshold: ${nitricAcid.threshold}`);
    console.log(`Status: ${nitricAcid.status}`);

    const notifications = await Notification.find({ 
      'related.chemicalId': nitricAcid.id,
      type: 'LOW_STOCK'
    }).sort({ createdAt: -1 });

    console.log('\n--- Notifications ---');
    if (notifications.length === 0) {
      console.log('No low stock notifications found for this chemical.');
    } else {
      notifications.forEach(n => {
        console.log(`[${n.createdAt.toISOString()}] ${n.title}`);
        console.log(`  Status: ${n.status}, Severity: ${n.severity}`);
        console.log(`  Channels: ${JSON.stringify(n.channels)}`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkNitricAcid();

