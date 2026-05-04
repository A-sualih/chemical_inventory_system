const mongoose = require('mongoose');

const disposalSchema = new mongoose.Schema({
  chemical_id: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quantity: { type: Number },
  method: { type: String },
  regulatory_log: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Disposal', disposalSchema);


