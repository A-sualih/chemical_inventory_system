const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Chemical = require('../models/Chemical');
require('dotenv').config();

async function findBatchInfo() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const batchId = 'BT-2015';
        const batch = await Batch.findOne({ batch_number: batchId });
        
        if (!batch) {
            console.log(`Batch ${batchId} not found.`);
            return;
        }

        const chemical = await Chemical.findOne({ id: batch.chemical_id });
        console.log('--- BATCH INFO ---');
        console.log(`Batch Number: ${batch.batch_number}`);
        console.log(`Expiry Date: ${batch.expiry_date}`);
        console.log(`Status: ${batch.status}`);
        console.log(`Chemical ID: ${batch.chemical_id}`);
        console.log(`Chemical Name: ${chemical ? chemical.name : 'Unknown'}`);
        console.log('------------------');

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

findBatchInfo();
