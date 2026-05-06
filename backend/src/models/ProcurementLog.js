const mongoose = require('mongoose');

const procurementLogSchema = new mongoose.Schema({
  entity_type: { type: String, enum: ['PurchaseOrder', 'Supplier', 'Shipment', 'VendorReview'], required: true },
  entity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  entity_name: { type: String },
  action: { type: String, required: true }, // e.g. 'CREATED', 'APPROVED', 'SHIPPED', 'RECEIVED'
  performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performed_by_name: { type: String },
  role: { type: String },
  details: { type: String },
  changes: { type: mongoose.Schema.Types.Mixed }, // Before/after snapshot
  ip_address: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

procurementLogSchema.index({ entity_type: 1, entity_id: 1 });
procurementLogSchema.index({ performed_by: 1 });
procurementLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ProcurementLog', procurementLogSchema);
