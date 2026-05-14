const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['Active', 'Under Maintenance', 'Inactive'], default: 'Active' },
  metadata: { type: Map, of: String }
}, { timestamps: true });

// Unique name per LAB
blockSchema.index({ lab: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Block', blockSchema);
