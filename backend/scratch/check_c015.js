const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Notification = require('../src/models/Notification');

async function checkNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const notifications = await Notification.find({ 
      'related.chemicalId': 'C015',
      type: 'LOW_STOCK'
    });
    console.log(`Found ${notifications.length} notifications for C015.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkNotifications();
