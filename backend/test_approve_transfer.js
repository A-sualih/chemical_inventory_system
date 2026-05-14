const mongoose = require('mongoose');
require('./src/models/Lab');
require('./src/models/User');
require('./src/models/Chemical');
require('./src/models/Batch');
require('./src/models/Container');
require('./src/models/InventoryLog');
const TransferRequest = require('./src/models/TransferRequest');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find a pending transfer
        const transfer = await TransferRequest.findOne({ status: 'Pending' }).populate('source_lab');
        if (!transfer) {
           console.log("No pending transfers found.");
           process.exit(0);
        }
        
        console.log("Found transfer ID:", transfer._id);
        console.log("For chemical:", transfer.chemical_id);
        
        // Setup mock req object for the controller
        const req = {
            params: { id: transfer._id },
            activeLabId: transfer.source_lab._id,
            user: {
               id: transfer.requested_by,
               name: "Test User",
               role: "Lab Manager"
            }
        };
        
        const res = {
            status: (code) => {
               console.log("Status:", code);
               return {
                   json: (data) => console.log("Response:", data)
               };
            },
            json: (data) => console.log("Response:", data)
        };
        
        const controller = require('./src/controllers/transfer/transferController');
        
        console.log("Running approveTransfer...");
        await controller.approveTransfer(req, res);
        
    } catch (e) {
        console.error("Test Script Error:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
run();
