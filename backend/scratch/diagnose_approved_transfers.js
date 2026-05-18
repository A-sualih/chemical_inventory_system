const mongoose = require('mongoose');
require('../src/models/Lab');
require('../src/models/User');
require('../src/models/Chemical');
require('../src/models/Batch');
require('../src/models/Container');
require('../src/models/InventoryLog');
const TransferRequest = require('../src/models/TransferRequest');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const approvedTransfers = await TransferRequest.find({ status: 'Approved' })
            .populate('chemical_id')
            .populate('source_lab', 'name')
            .populate('destination_lab', 'name');

        console.log(`Found ${approvedTransfers.length} Approved transfers:`);
        for (const t of approvedTransfers) {
            console.log("-----------------------------------------");
            console.log(`Transfer ID: ${t._id}`);
            console.log(`Chemical Name: ${t.chemical_id ? t.chemical_id.name : 'Unknown'} (Custom ID: ${t.chemical_id ? t.chemical_id.id : 'Unknown'})`);
            console.log(`Source Lab: ${t.source_lab ? t.source_lab.name : 'Unknown'}`);
            console.log(`Dest Lab: ${t.destination_lab ? t.destination_lab.name : 'Unknown'}`);
            console.log(`Quantity: ${t.quantity_moved} ${t.unit}`);
            console.log(`Batch Number requested: ${t.batch_number}`);
            console.log(`Container ID requested: ${t.container_id}`);

            // Search destination batches
            const customChemId = t.chemical_id ? t.chemical_id.id : null;
            const mongoChemId = t.chemical_id ? t.chemical_id._id : null;

            if (customChemId) {
                const destBatchesById = await mongoose.model('Batch').find({ chemical_id: customChemId, lab: t.destination_lab });
                const destBatchesByMongoId = await mongoose.model('Batch').find({ chemical_id: mongoChemId.toString(), lab: t.destination_lab });
                const destContainersById = await mongoose.model('Container').find({ chemical_id: customChemId, lab: t.destination_lab });
                const destContainersByMongoId = await mongoose.model('Container').find({ chemical_id: mongoChemId.toString(), lab: t.destination_lab });

                console.log(`  - Dest Batches found by Custom ID (${customChemId}): ${destBatchesById.length}`);
                console.log(`  - Dest Batches found by Mongo ID (${mongoChemId}): ${destBatchesByMongoId.length}`);
                console.log(`  - Dest Containers found by Custom ID (${customChemId}): ${destContainersById.length}`);
                console.log(`  - Dest Containers found by Mongo ID (${mongoChemId}): ${destContainersByMongoId.length}`);
            } else {
                console.log("  - No chemical info available to query.");
            }
        }
    } catch (e) {
        console.error("Diagnostic failed:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
