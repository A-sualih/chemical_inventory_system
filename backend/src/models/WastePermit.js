const mongoose = require('mongoose');

const wastePermitSchema = new mongoose.Schema({
  permit_number: { type: String, required: true, unique: true },
  regulatory_body: { type: String, required: true }, // e.g. EPA, Municipal Authority
  type: { type: String, enum: ['Hazardous Waste Generation', 'Transportation', 'On-site Treatment', 'Storage'], required: true },
  
  issue_date: { type: Date, required: true },
  expiry_date: { type: Date, required: true },
  
  // Disposal Limits
  limits: [{
    hazard_class: { type: String }, // e.g. Flammable, Corrosive, or 'Total'
    max_quantity: { type: Number },
    current_quantity: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
    period: { type: String, enum: ['Monthly', 'Quarterly', 'Annual'], default: 'Annual' }
  }],
  
  status: { type: String, enum: ['Active', 'Expired', 'Pending Renewal', 'Suspended'], default: 'Active' },
  
  documents: [{
    name: { type: String },
    url: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  }],
  
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('WastePermit', wastePermitSchema);
