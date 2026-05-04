const mongoose = require('mongoose');

const chemicalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  name: { type: String, required: true },
  iupac_name: { type: String },
  cas_number: { type: String },
  formula: { type: String },
  quantity: { type: Number },
  unit: { type: String },
  base_quantity: { type: Number }, 
  base_unit: { type: String },
  state: { type: String },
  purity: { type: String },
  concentration: { type: String },
  storage_temp: { type: String },
  storage_humidity: { type: String },
  supplier: { type: String },
  batch_number: { type: String },
  manufacturing_date: { type: String },
  purchase_date: { type: String },
  expiry_date: { type: String },
  num_containers: { type: Number, default: 1 },
  quantity_per_container: { type: Number },
  container_type: { type: String },
  container_id_series: { type: String },
  building: { type: String },
  room: { type: String },
  cabinet: { type: String },
  shelf: { type: String },
  remarks: { type: String },
  chemical_family: { type: String },
  spill_instructions: { type: String },
  emergency_instructions: { type: String },
  exposure_risks: [{ type: String }],
  ghs_classes: [{ type: String }],
  
  // Advanced Safety & Hazard Fields
  ghs_hazards: {
    categories: [{ type: String }], // e.g., "Flammable Liquid Category 2"
    signal_word: { type: String, enum: ['Danger', 'Warning', 'None'], default: 'None' },
    h_codes: [{ type: String }], // Hazard statements
    p_codes: [{ type: String }], // Precautionary statements
    pictograms: [{ type: String }], // Keys for GHS pictograms
  },
  
  nfpa_rating: {
    health: { type: Number, min: 0, max: 4, default: 0 },
    flammability: { type: Number, min: 0, max: 4, default: 0 },
    reactivity: { type: Number, min: 0, max: 4, default: 0 },
    special: { type: String } // e.g., OX, W, SA
  },
  
  hazard_summary: {
    health: { type: Boolean, default: false },
    physical: { type: Boolean, default: false },
    environmental: { type: Boolean, default: false }
  },
  
  ppe_requirements: [{ type: String }], // e.g., "Gloves", "Goggles", "Respirator"
  
  incompatibility: [{ type: String }], // Incompatible chemical classes/names
  
  emergency_response: {
    first_aid: { type: String },
    fire_response: { type: String },
    evacuation: { type: String },
    neutralization: { type: String },
    shutdown_steps: { type: String },
    contacts: [{
      name: { type: String },
      phone: { type: String }
    }]
  },
  
  exposure_details: {
    acute_toxicity: { type: String },
    chronic_toxicity: { type: String },
    carcinogenic: { type: Boolean, default: false },
    mutagenic: { type: Boolean, default: false },
    exposure_limits: { type: String },
    risk_level: { type: String, enum: ['Low', 'Medium', 'High', 'Extreme'], default: 'Low' },
    ventilation_required: { type: Boolean, default: false },
    fume_hood_required: { type: Boolean, default: false }
  },
  
  sds_docs: [{
    language: { type: String, default: 'English' },
    version: { type: String },
    upload_date: { type: Date, default: Date.now },
    file_url: { type: String },
    manufacturer: { type: String },
    verification_status: { type: String, enum: ['Pending', 'Verified', 'Expired'], default: 'Pending' }
  }],
  
  restricted_access: { type: Boolean, default: false },
  training_required: { type: Boolean, default: false },

  sds_attached: { type: Boolean },
  sds_file_name: { type: String },
  sds_file_url: { type: String },
  location: { type: String },
  status: { type: String },
  threshold: { type: Number, default: 5 },
  archived: { type: Boolean, default: false }
}, { timestamps: true });


// Indexing for performance
chemicalSchema.index({ name: 'text', iupac_name: 'text', cas_number: 'text', formula: 'text', batch_number: 'text' });
chemicalSchema.index({ id: 1 });
chemicalSchema.index({ cas_number: 1 });
chemicalSchema.index({ status: 1 });
chemicalSchema.index({ building: 1 });
chemicalSchema.index({ room: 1 });
chemicalSchema.index({ archived: 1 });

module.exports = mongoose.model('Chemical', chemicalSchema);



