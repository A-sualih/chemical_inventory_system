const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Chemical = require('../src/models/Chemical');
const notificationService = require('../src/services/notificationService');

async function repairLowStockNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const chemicals = await Chemical.find({ quantity: { $gt: 0 } });
    console.log(`Checking ${chemicals.length} chemicals...`);

    for (const chem of chemicals) {
      const threshold = chem.threshold !== undefined ? chem.threshold : 5;
      if (chem.quantity <= threshold) {
        console.log(`Triggering low stock alert for ${chem.name} (${chem.id}) - Qty: ${chem.quantity} ${chem.unit}, Threshold: ${threshold}`);
        await notificationService.notifyLowStock(chem, threshold);
      }
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error(err);
  }
}

repairLowStockNotifications();
