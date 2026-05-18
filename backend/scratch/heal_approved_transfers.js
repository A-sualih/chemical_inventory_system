const mongoose = require('mongoose');
require('../src/models/Lab');
require('../src/models/User');
require('../src/models/Chemical');
require('../src/models/Batch');
require('../src/models/Container');
require('../src/models/InventoryLog');
const TransferRequest = require('../src/models/TransferRequest');
const { convertToBase, convertFromBase } = require('../src/utils/unitConverter');
require('dotenv').config();

const Chemical = mongoose.model('Chemical');
const Batch = mongoose.model('Batch');
const Container = mongoose.model('Container');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const approvedTransfers = await TransferRequest.find({ status: 'Approved' })
            .populate('chemical_id')
            .populate('source_lab')
            .populate('destination_lab');

        console.log(`Processing ${approvedTransfers.length} Approved transfers...`);

        for (const t of approvedTransfers) {
            const customId = t.chemical_id ? t.chemical_id.id : null;
            if (!customId) continue;

            // Check if a container with the exact quantity of this transfer already exists in the destination lab
            const targetQtyBase = convertToBase(t.quantity_moved, t.unit);
            
            // Find all containers for this chemical in destination lab
            const destContainers = await Container.find({ chemical_id: customId, lab: t.destination_lab._id });
            
            // Check if any container's quantity matches targetQtyBase (with a small margin of error for float precision)
            const alreadyHealed = destContainers.some(c => {
                const cQtyBase = convertToBase(c.quantity, c.unit);
                return Math.abs(cQtyBase - targetQtyBase) < 0.0001;
            });

            if (alreadyHealed) {
                console.log(`Transfer ${t._id} for ${t.chemical_id.name} (${t.quantity_moved} ${t.unit}) already has a matching container in destination. Skipping.`);
                continue;
            }

            console.log(`\nHealing Transfer ID: ${t._id} (${t.chemical_id.name}, ${t.quantity_moved} ${t.unit})`);

            // 1. Get source and destination chemicals
            const sourceChemical = await Chemical.findOne({ id: customId, lab: t.source_lab._id });
            const destChemical = await Chemical.findOne({ id: customId, lab: t.destination_lab._id });

            if (!sourceChemical || !destChemical) {
                console.log(`  [ERROR] Source or destination chemical document not found for ${customId}.`);
                continue;
            }

            // 2. Find batches in source lab
            const sourceBatches = await Batch.find({ chemical_id: customId, lab: t.source_lab._id }).sort({ expiry_date: 1 });
            console.log(`  Found ${sourceBatches.length} source batches.`);

            const amountInBase = convertToBase(t.quantity_moved, t.unit);
            let remaining = amountInBase;

            for (const batch of sourceBatches) {
                if (remaining <= 0) break;

                // Let's create the batch in the destination lab
                let destBatch = await Batch.findOne({ chemical_id: destChemical.id, lab: t.destination_lab._id, batch_number: batch.batch_number });
                if (!destBatch) {
                    destBatch = new Batch({
                        ...batch.toObject(),
                        _id: new mongoose.Types.ObjectId(),
                        chemical_id: destChemical.id,
                        lab: t.destination_lab._id,
                        total_quantity: 0
                    });
                    await destBatch.save();
                    console.log(`  Created destination Batch: ${destBatch.batch_number}`);
                }

                const batchQtyToAdd = convertFromBase(remaining, destBatch.unit);
                destBatch.total_quantity += batchQtyToAdd;
                await destBatch.save();
                console.log(`  Updated destination Batch ${destBatch.batch_number} total quantity by +${batchQtyToAdd} ${destBatch.unit}`);

                // Create container in destination lab for this amount
                const destContainer = new Container({
                    container_id: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    chemical_id: destChemical.id,
                    batch_number: batch.batch_number,
                    lab: t.destination_lab._id,
                    quantity: convertFromBase(remaining, t.unit),
                    unit: t.unit,
                    expiry_date: batch.expiry_date,
                    status: 'In Use',
                    location: 'Receipt Area'
                });
                await destContainer.save();
                console.log(`  Created destination Container: ${destContainer.container_id} with ${destContainer.quantity} ${destContainer.unit}`);

                remaining = 0; // Heal handles the transferred amount in one go or FIFO
            }

            // Fallback if no source batches are found (create a dummy batch and container so it is at least visible)
            if (sourceBatches.length === 0) {
                console.log(`  [WARNING] No source batches found. Creating fallback batch and container.`);
                const batchNum = t.batch_number || `BATCH-TR-${Date.now()}`;
                
                let destBatch = await Batch.findOne({ chemical_id: destChemical.id, lab: t.destination_lab._id, batch_number: batchNum });
                if (!destBatch) {
                    destBatch = new Batch({
                        batch_number: batchNum,
                        chemical_id: destChemical.id,
                        lab: t.destination_lab._id,
                        total_quantity: t.quantity_moved,
                        unit: t.unit,
                        expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year fallback
                        status: 'Active'
                    });
                    await destBatch.save();
                    console.log(`  Created fallback destination Batch: ${destBatch.batch_number}`);
                } else {
                    destBatch.total_quantity += t.quantity_moved;
                    await destBatch.save();
                }

                const destContainer = new Container({
                    container_id: `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    chemical_id: destChemical.id,
                    batch_number: batchNum,
                    lab: t.destination_lab._id,
                    quantity: t.quantity_moved,
                    unit: t.unit,
                    expiry_date: destBatch.expiry_date,
                    status: 'In Use',
                    location: 'Receipt Area'
                });
                await destContainer.save();
                console.log(`  Created fallback destination Container: ${destContainer.container_id}`);
            }
        }

        console.log("\nHealing complete!");
    } catch (e) {
        console.error("Healing failed:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
