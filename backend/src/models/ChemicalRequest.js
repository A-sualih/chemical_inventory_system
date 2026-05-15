const mongoose = require('mongoose');

const chemicalRequestSchema = new mongoose.Schema({
  chemical_name: { type: String, required: true },
  cas_number: { type: String },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  reason: { type: String, required: true },
  
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  
  status: { 
    type: String, 
    enum: ['Pending', 'Rejected', 'Purchase Requested', 'Transfer Requested', 'Completed'], 
    default: 'Pending' 
  },
  
  action_taken: {
    type: String,
    enum: ['None', 'Reject', 'Buy', 'Transfer'],
    default: 'None'
  },
  
  manager_notes: { type: String },
  
  // Choice B: Purchase
  purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  
  // Choice C: Transfer
  transfer_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TransferRequest' },
  target_lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },

  notified: { type: Boolean, default: false } // To track if technician was notified of the final result
}, { timestamps: true });

module.exports = mongoose.model('ChemicalRequest', chemicalRequestSchema);
