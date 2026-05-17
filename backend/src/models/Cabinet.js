const mongoose = require('mongoose');

const cabinetSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  max_shelves: { type: Number, default: 10 },
  status: { type: String, enum: ['Active', 'Full', 'Inactive'], default: 'Active' },
  metadata: { type: Map, of: String }
}, { timestamps: true });

// Unique name per ROOM
cabinetSchema.index({ room: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Cabinet', cabinetSchema);

