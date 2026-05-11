const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function checkLabManagers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const managers = await User.find({ role: 'Lab Manager' });
    console.log(`Found ${managers.length} Lab Managers:`);
    managers.forEach(m => {
      console.log(`- ${m.name} (${m.email}) - Status: ${m.status}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkLabManagers();
