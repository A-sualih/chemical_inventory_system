const mongoose = require('mongoose');
require('dotenv').config();

async function searchAllCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const searchString = '7cqw3q';
    console.log(`Searching for '${searchString}' in all collections...`);
    
    for (const colInfo of collections) {
      const collection = db.collection(colInfo.name);
      console.log(`Checking collection: ${colInfo.name}`);
      
      const allDocs = await collection.find({}).toArray();
      for (const doc of allDocs) {
          const docString = JSON.stringify(doc);
          if (docString.toLowerCase().includes(searchString.toLowerCase())) {
              console.log(`FOUND in collection '${colInfo.name}':`);
              console.log(JSON.stringify(doc, null, 2));
          }
      }
    }
    
    await mongoose.connection.close();
    console.log('Search complete.');
  } catch (err) {
    console.error(err);
  }
}

searchAllCollections();
