const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  chemical_id: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quantity: { type: Number },
  status: { type: String, default: 'Pending' },
  justification: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
