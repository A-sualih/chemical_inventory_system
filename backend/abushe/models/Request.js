const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  chemical_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chemical', required: true },
  container_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, required: true },
  unit: { type: String },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  handled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handled_at: { type: Date },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);

