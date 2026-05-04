const mongoose = require('mongoose');
require('dotenv').config();
const Chemical = require('../../models/Chemical');
const Container = require('../../models/Container');
const { notifyExpiry } = require('./utils/notificationService');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database.');

    // Find any container that is expired or close to expiring
    const now = new Date();
    const target = await Container.findOne({}).sort({ expiry_date: 1 }); // Oldest/Soonest first
    
    if (target) {
      const chem = await Chemical.findOne({ id: target.chemical_id });
      if (chem) {
        console.log(`Triggering REAL expiry alert for: ${chem.name} (Container: ${target.container_id})`);
        
        // Calculate days remaining (could be negative if already expired)
        const diffTime = new Date(target.expiry_date) - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        await notifyExpiry(chem, target, diffDays);
        console.log('Real notification triggered successfully.');
      } else {
        console.log('Chemical not found for container.');
      }
    } else {
      console.log('No containers found in database.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();



