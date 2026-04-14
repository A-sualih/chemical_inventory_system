const mongoose = require('mongoose');

const disposalSchema = new mongoose.Schema({
  chemical_id: { type: String, required: true },
  container_id: { type: String }, // NEW
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quantity: { type: Number, required: true },
  unit: { type: String }, // Added unit for clarity
  reason: { type: String, required: true }, // NEW
  method: { type: String, required: true }, // NEW
  notes: { type: String }, // NEW
  regulatory_log: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Disposal', disposalSchema);
