const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  max_cabinets: { type: Number, default: 20 },
  status: { type: String, enum: ['Active', 'Full', 'Under Maintenance', 'Inactive'], default: 'Active' },
  metadata: { type: Map, of: String }
}, { timestamps: true });

// Unique name per BLOCK
roomSchema.index({ block: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);

