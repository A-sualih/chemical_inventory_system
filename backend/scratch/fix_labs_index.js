/**
 * One-time fix: drops the stale `code_1` unique index from the `labs` collection.
 * Run with: node backend/scratch/fix_labs_index.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function fixLabsIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('labs');

    // List current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes on labs:', indexes.map(i => i.name));

    // Drop the stale code_1 index if it exists
    const hasCodeIndex = indexes.some(i => i.name === 'code_1');
    if (hasCodeIndex) {
      await collection.dropIndex('code_1');
      console.log('✅ Dropped stale index: code_1');
    } else {
      console.log('ℹ️  Index code_1 not found — nothing to drop.');
    }

    // Also nullify any code: null fields if they exist (cleanup)
    const result = await collection.updateMany(
      { code: null },
      { $unset: { code: '' } }
    );
    console.log(`✅ Cleaned up ${result.modifiedCount} documents with code: null`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

fixLabsIndex();

