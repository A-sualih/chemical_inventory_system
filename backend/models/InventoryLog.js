const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  chemical_id: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String },
  quantity_change: { type: Number },
  unit: { type: String },
  reason: { type: String },
  old_location: { type: String },
  new_location: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
