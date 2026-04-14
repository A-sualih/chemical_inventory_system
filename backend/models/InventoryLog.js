const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  chemical_id: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String }, // IN, OUT, TRANSFER, DISPOSAL
  quantity_change: { type: Number },
  unit: { type: String },
  reason: { type: String },
  batch_number: { type: String },
  building: { type: String },
  room: { type: String },
  cabinet: { type: String },
  shelf: { type: String },
  experiment_name: { type: String },
  department: { type: String },
  disposal_method: { type: String },
  disposal_approved_by: { type: String },
  disposal_approved_role: { type: String },
  compliance_notes: { type: String },
  user_role: { type: String },
  // Structured Destination Location for Transfer
  to_building: { type: String },
  to_room: { type: String },
  to_cabinet: { type: String },
  to_shelf: { type: String },
  // Container & Transfer Specifics
  container_id: { type: String },
  num_containers_moved: { type: Number },
  transfer_approved_by: { type: String },
  old_location: { type: String },
  new_location: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
