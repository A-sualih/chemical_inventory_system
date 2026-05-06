const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  contact_person: { type: String },
  contact_email: { type: String },
  contact_phone: { type: String },
  address: { type: String },
  website: { type: String },
  // Vendor Performance Tracking
  rating: { type: Number, min: 0, max: 5, default: 0 },
  average_lead_time_days: { type: Number, default: 0 },
  total_orders_fulfilled: { type: Number, default: 0 },
  on_time_delivery_rate: { type: Number, default: 100 }, // Percentage
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Supplier', supplierSchema);
