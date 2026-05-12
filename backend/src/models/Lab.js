const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  head_officer: { type: String }, 
  contact_email: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Lab', labSchema);
