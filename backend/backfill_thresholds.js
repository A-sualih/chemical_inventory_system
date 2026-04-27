const mongoose = require('mongoose');
require('dotenv').config();
const Chemical = require('./models/Chemical');

async function checkAndFix() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');

    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas.');

    const missingThreshold = await Chemical.find({ threshold: { $exists: false } });
    console.log(`Found ${missingThreshold.length} chemicals without a threshold field.`);

    if (missingThreshold.length > 0) {
      const result = await Chemical.updateMany(
        { threshold: { $exists: false } },
        { $set: { threshold: 5 } }
      );
      console.log(`Updated ${result.modifiedCount} chemicals with default threshold = 5.`);
    }

    const co2 = await Chemical.findOne({ name: /Carbon Dioxide/i });
    if (co2) {
      console.log('Carbon Dioxide Data:', JSON.stringify({
        name: co2.name,
        quantity: co2.quantity,
        unit: co2.unit,
        threshold: co2.threshold
      }, null, 2));
    } else {
      console.log('Carbon Dioxide not found.');
      const all = await Chemical.find({}, 'name');
      console.log('Available chemicals:', all.map(c => c.name));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAndFix();
