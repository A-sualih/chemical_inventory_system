const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
  source_lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  destination_lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  chemical_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chemical', required: true },
  batch_number: { type: String },
  container_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Container' },
  quantity_moved: { type: Number, required: true },
  unit: { type: String, required: true },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  transfer_date: { type: Date },
  rejection_reason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
