const mongoose = require('mongoose');

const wasteSafetyProtocolSchema = new mongoose.Schema({
  waste_type: { type: String, required: true, unique: true }, // e.g. Flammable, Corrosive, Toxic
  hazard_level: { type: String, enum: ['Low', 'Moderate', 'High', 'Extreme'], default: 'Moderate' },
  
  // Required PPE
  required_ppe: [{ type: String }], // e.g. Gloves, Goggles, Respirator, Lab Coat
  
  // Procedures
  handling_procedure: { type: String },
  cleanup_procedure: { type: String, required: true },
  emergency_contact: { type: String },
  
  // Environmental Impact Guidance
  environmental_risks: [{ type: String }], // e.g. Groundwater contamination, Air quality
  impact_mitigation: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('WasteSafetyProtocol', wasteSafetyProtocolSchema);
