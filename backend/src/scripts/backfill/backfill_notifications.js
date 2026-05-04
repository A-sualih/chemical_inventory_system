const mongoose = require('mongoose');
require('dotenv').config();
const Chemical = require('../../models/Chemical');
const Container = require('../../models/Container');
const { notifyExpiry } = require('./utils/notificationService');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- EXPIRE ALERTS BACKFILL START ---');

    const now = new Date();
    const nearExpiryCutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const containers = await Container.find({
      $or: [
        { expiry_date: { $lt: now } },
        { expiry_date: { $lt: nearExpiryCutoff } }
      ],
      status: { $nin: ['Empty', 'Damaged'] }
    });

    console.log(`Found ${containers.length} containers needing alerts.`);

    let count = 0;
    for (const container of containers) {
      const chemical = await Chemical.findOne({ id: container.chemical_id });
      if (chemical) {
        const diffTime = new Date(container.expiry_date) - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        await notifyExpiry(chemical, container, diffDays);
        console.log(`[Alert Sent] ${chemical.name} - Container: ${container.container_id}`);
        count++;
        // Small delay to prevent SMTP throttling
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`--- BACKFILL COMPLETE. Total alerts processed: ${count} ---`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();



