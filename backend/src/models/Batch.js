const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batch_number: { type: String, required: true, unique: true },
  chemical_id: { type: String, required: true }, // Links to Chemical.id
  total_quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  manufacturing_date: { type: Date },
  expiry_date: { type: Date, required: true },
  supplier_name: { type: String },
  supplier_batch_code: { type: String },
  status: {
    type: String,
    enum: ['Active', 'Near Expiry', 'Expired', 'Recalled'],
    default: 'Active'
  },
  building: { type: String },
  room: { type: String },
  cabinet: { type: String },
  shelf: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);


