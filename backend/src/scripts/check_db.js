const mongoose = require('mongoose');
const uri = 'mongodb+srv://Chemical:Chemical123@chemical.xfmpuwe.mongodb.net/chemical_inventory?retryWrites=true&w=majority';

async function testConnection() {
  try {
    console.log('Testing connection to:', uri.split('@')[1]); // Don't log credentials
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('SUCCESS: Connected to MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('FAILURE:', err.name, err.message);
    process.exit(1);
  }
}

testConnection();
