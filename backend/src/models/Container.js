const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema({
  container_id: { type: String, required: true, unique: true },
  barcode: { type: String },
  chemical_id: { type: String, required: true }, // Links to Chemical.id or _id
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  building: { type: String },
  room: { type: String },
  cabinet: { type: String },
  shelf: { type: String },
  batch_number: { type: String },
  manufacturing_date: { type: Date },
  expiry_date: { type: Date },
  opened_date: { type: Date },
  shelf_life_days: { type: Number }, // Days allowed after opening
  container_type: { type: String }, // Glass bottle, Plastic bottle, Drum, Tank
  status: { 
    type: String, 
    enum: ['Full', 'In Use', 'Empty', 'Expired', 'Damaged', 'Near Expiry'],
    default: 'Full'
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Container', containerSchema);


