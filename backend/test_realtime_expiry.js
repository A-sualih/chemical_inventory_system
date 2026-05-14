const mongoose = require('mongoose');
const { checkChemicalExpiry } = require('./src/services/expiryService');
const Chemical = require('./src/models/Chemical');
const Container = require('./src/models/Container');
const Notification = require('./src/models/Notification');
require('dotenv').config();

async function testRealTimeExpiry() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testLabId = new mongoose.Types.ObjectId().toString();
    const testUser = { name: 'Test User', email: 'testuser@example.com' };

    // 1. Create a chemical
    const chem = new Chemical({
      id: 'T-EXP-001',
      name: 'Real-time Test Chemical',
      expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      lab: testLabId,
      status: 'Near Expiry',
      unit: 'L',
      quantity: 10
    });
    await chem.save();
    console.log('Test chemical created');

    // 2. Create a container
    const container = new Container({
      chemical_id: chem.id,
      container_id: 'TEST-C-001',
      expiry_date: chem.expiry_date,
      lab: testLabId,
      status: 'Near Expiry',
      unit: 'L',
      quantity: 10
    });
    await container.save();
    console.log('Test container created');

    // 3. Trigger expiry check with user context
    console.log('Triggering checkChemicalExpiry with user context...');
    await checkChemicalExpiry(chem, testUser);

    // 4. Verify notification
    const notif = await Notification.findOne({
      'related.chemicalId': chem.id,
      lab: testLabId
    });

    if (notif) {
      console.log('SUCCESS: Notification found!');
      console.log('Title:', notif.title);
      console.log('Triggered By Email:', notif.metadata?.triggeredByEmail);
      
      if (notif.metadata?.triggeredByEmail === testUser.email) {
        console.log('USER CONTEXT VERIFIED: Triggered user email matches.');
      } else {
        console.error('ERROR: Triggered user email does not match!');
      }
    } else {
      console.error('FAILURE: Notification not found!');
    }

    // Cleanup
    await Chemical.deleteOne({ id: 'T-EXP-001' });
    await Container.deleteOne({ container_id: 'TEST-C-001' });
    if (notif) await Notification.deleteOne({ _id: notif._id });
    
    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testRealTimeExpiry();
