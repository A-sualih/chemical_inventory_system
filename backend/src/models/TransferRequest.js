const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
  // The lab that HAS the chemical (will send/approve)
  source_lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  // The lab that REQUESTS/WANTS the chemical
  destination_lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  chemical_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chemical', required: true },
  batch_number: { type: String },
  container_id: { type: String },   // Human-readable container ID e.g. 'C005-2'
  quantity_moved: { type: Number, required: true },
  unit: { type: String, required: true },
  reason: { type: String },  // Why the chemical is being requested
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
