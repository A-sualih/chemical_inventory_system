const mongoose = require('mongoose');
require('../src/models/Lab');
require('../src/models/User');
require('../src/models/Chemical');
require('../src/models/Batch');
require('../src/models/Container');
require('../src/models/InventoryLog');
const TransferRequest = require('../src/models/TransferRequest');
require('dotenv').config();

const Lab = mongoose.model('Lab');
const Chemical = mongoose.model('Chemical');
const Batch = mongoose.model('Batch');
const Container = mongoose.model('Container');
const User = mongoose.model('User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        // 1. Create source and destination Labs
        const sourceLab = new Lab({ name: "Source Test Lab " + Date.now() });
        const destLab = new Lab({ name: "Dest Test Lab " + Date.now() });
        await sourceLab.save();
        await destLab.save();
        console.log("Created Labs.");

        // 2. Create Chemical in source lab
        const sourceChem = new Chemical({
            id: "CHEM-" + Date.now(),
            name: "Test Transfer Chemical",
            lab: sourceLab._id,
            quantity: 100,
            base_quantity: 100,
            unit: "L",
            status: "In Stock"
        });
        await sourceChem.save();
        console.log("Created source Chemical. ID: " + sourceChem.id);

        // 3. Create Batch for the chemical in source lab
        const sourceBatch = new Batch({
            batch_number: "BATCH-" + Date.now(),
            chemical_id: sourceChem.id,
            lab: sourceLab._id,
            total_quantity: 100,
            unit: "L",
            expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 100) // 100 days
        });
        await sourceBatch.save();
        console.log("Created source Batch. Number: " + sourceBatch.batch_number);

        // 4. Create Container for the chemical/batch in source lab
        const sourceContainer = new Container({
            container_id: "CONT-" + Date.now(),
            chemical_id: sourceChem.id,
            batch_number: sourceBatch.batch_number,
            lab: sourceLab._id,
            quantity: 100,
            unit: "L"
        });
        await sourceContainer.save();
        console.log("Created source Container. ID: " + sourceContainer.container_id);

        // 5. Create Transfer Request
        const request = new TransferRequest({
            chemical_id: sourceChem._id,
            source_lab: sourceLab._id,
            destination_lab: destLab._id,
            quantity_moved: 30,
            unit: "L",
            reason: "Testing transfer alignment",
            requested_by: new mongoose.Types.ObjectId()
        });
        await request.save();
        console.log("Created Transfer Request. ID: " + request._id);

        // 6. Run Controller approval
        const req = {
            params: { id: request._id },
            activeLabId: sourceLab._id,
            user: {
                id: request.requested_by,
                name: "Test User",
                role: "Lab Manager"
            }
        };

        const res = {
            status: (code) => {
                console.log("Response Status Code:", code);
                return {
                    json: (data) => console.log("Response Data:", data)
                };
            },
            json: (data) => console.log("Response Data:", data)
        };

        const controller = require('../src/controllers/transfer/transferController');
        console.log("Approving Transfer...");
        await controller.approveTransfer(req, res);

        // 7. Verify the destination lab results
        const destChem = await Chemical.findOne({ id: sourceChem.id, lab: destLab._id });
        console.log("Destination Chemical Quantity (should be 30):", destChem?.quantity);

        const destBatches = await Batch.find({ chemical_id: sourceChem.id, lab: destLab._id });
        console.log("Destination Batches found:", destBatches.length);
        if (destBatches.length > 0) {
            console.log("Destination Batch Quantity (should be 30):", destBatches[0].total_quantity);
            console.log("Destination Batch chemical_id (should match custom id):", destBatches[0].chemical_id);
        }

        const destContainers = await Container.find({ chemical_id: sourceChem.id, lab: destLab._id });
        console.log("Destination Containers found:", destContainers.length);
        if (destContainers.length > 0) {
            console.log("Destination Container Quantity (should be 30):", destContainers[0].quantity);
            console.log("Destination Container chemical_id (should match custom id):", destContainers[0].chemical_id);
        }

        // Clean up
        await Lab.deleteMany({ _id: { $in: [sourceLab._id, destLab._id] } });
        await Chemical.deleteMany({ id: sourceChem.id });
        await Batch.deleteMany({ chemical_id: sourceChem.id });
        await Container.deleteMany({ chemical_id: sourceChem.id });
        await TransferRequest.deleteMany({ _id: request._id });
        console.log("Cleanup complete.");

    } catch (e) {
        console.error("Test execution failed:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
