const mongoose = require('mongoose');

const wasteDisposalSchema = new mongoose.Schema({
  disposal_id: { type: String, required: true, unique: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  chemical_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chemical', required: true },
  chemical_name: { type: String, required: true },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  batch_number: { type: String },
  container_id: { type: String }, // Optional: link to specific container if tracked
  
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  
  hazard_classification: { type: String }, // e.g. Flammable, Toxic, Corrosive
  reason: { 
    type: String, 
    enum: ['Expired', 'Contaminated', 'Damaged', 'Excess stock', 'Experimental waste', 'Other'],
    required: true 
  },
  
  disposal_date: { type: Date, default: Date.now },
  location: { type: String },
  responsible_person: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  responsible_person_name: { type: String },
  
  // Approval Workflow
  status: { 
    type: String, 
    enum: ['Pending Approval', 'Approved', 'Disposed', 'Rejected', 'Cancelled'],
    default: 'Pending Approval'
  },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approval_date: { type: Date },
  approval_notes: { type: String },
  
  // Disposal Method Details
  method: {
    type: String,
    enum: ['Neutralization', 'Incineration', 'Chemical treatment', 'Recycling', 'Waste contractor pickup', 'Secure hazardous storage'],
    required: true
  },
  method_details: {
    safety_procedure_followed: { type: Boolean, default: false },
    operator_name: { type: String },
    facility_name: { type: String },
    treatment_details: { type: String },
    completion_date: { type: Date },
    verification_outcome: { type: String },
    
    // Neutralization Specific
    neutralization: {
      initial_ph: { type: Number },
      final_ph: { type: Number },
      neutralizing_agent: { type: String },
      compatible_agents_verified: { type: Boolean, default: false },
      safe_range_validated: { type: Boolean, default: false }
    },
    
    // Incineration Specific
    incineration: {
      temperature: { type: Number },
      gas_handling_verified: { type: Boolean, default: false },
      certificate_number: { type: String },
      final_report_url: { type: String }
    }
  },
  
  // Environmental & Safety
  environmental_impact: {
    hazard_level: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
    risk_assessment: { type: String },
    ppe_verified: { type: Boolean, default: false },
    spill_risk: { type: Boolean, default: false },
    toxic_emissions: { type: Boolean, default: false }
  },
  
  // Compliance & Documentation
  compliance: {
    manifest_number: { type: String },
    regulatory_permit: { type: String },
    certificate_url: { type: String },
    is_compliant: { type: Boolean, default: true }
  },
  
  supporting_docs: [{
    name: { type: String },
    url: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  }],
  
  notes: { type: String },
  
  // Track which batches were affected (especially for FIFO)
  fifo_impact: [{
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batch_number: { type: String },
    subtract_quantity: { type: Number },
    unit: { type: String }
  }]
}, { timestamps: true });

// Auto-generate disposal ID (e.g., DISP-2024-001)
wasteDisposalSchema.pre('validate', async function() {
  if (!this.disposal_id) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('WasteDisposal').countDocuments();
    this.disposal_id = `WD-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

// wasteDisposalSchema.index({ disposal_id: 1 }); // Already unique: true in schema
wasteDisposalSchema.index({ chemical_id: 1 });
wasteDisposalSchema.index({ status: 1 });
wasteDisposalSchema.index({ method: 1 });

module.exports = mongoose.model('WasteDisposal', wasteDisposalSchema);

