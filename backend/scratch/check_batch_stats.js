const mongoose = require('mongoose');
require('dotenv').config();
const Chemical = require('../models/Chemical');
const Batch = require('../models/Batch');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const total = await Chemical.countDocuments({});
    const withBatchField = await Chemical.countDocuments({ batch_number: { $exists: true, $ne: "" } });
    const batchRecords = await Batch.countDocuments({});
    
    console.log("--- Inventory Statistics ---");
    console.log("Total Chemicals in Database:   ", total);
    console.log("Chemicals with a Batch ID:     ", withBatchField);
    console.log("Total Batch Records:           ", batchRecords);
    
    if (total > withBatchField) {
        console.log("\nWARNING: Some chemicals are missing a batch number.");
        const missing = await Chemical.find({ 
            $or: [
                { batch_number: { $exists: false } },
                { batch_number: "" }
            ]
        }).select('name id');
        console.log("Examples of missing batches:", missing.map(m => `${m.name} (${m.id})`).slice(0, 5));
    }
    
    process.exit(0);
}

run();
