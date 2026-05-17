const mongoose = require('mongoose');

const shelfSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  cabinet: { type: mongoose.Schema.Types.ObjectId, ref: 'Cabinet', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  capacity_limit: { type: Number, default: 50 },
  current_load: { type: Number, default: 0 },
  status: { type: String, enum: ['Available', 'Full', 'Maintenance'], default: 'Available' },
  metadata: { type: Map, of: String }
}, { timestamps: true });

// Unique name per CABINET
shelfSchema.index({ cabinet: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Shelf', shelfSchema);

