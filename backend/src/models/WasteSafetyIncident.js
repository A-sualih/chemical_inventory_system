const mongoose = require('mongoose');

const wasteSafetyIncidentSchema = new mongoose.Schema({
  incident_id: { type: String, required: true, unique: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  disposal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WasteDisposal' },
  
  type: {
    type: String,
    enum: ['Spill', 'Leak', 'Toxic Emission', 'Air Contamination', 'Water Contamination', 'Soil Contamination', 'PPE Violation', 'Other'],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['Minor', 'Moderate', 'Major', 'Critical'],
    required: true
  },
  
  location: { type: String, required: true },
  description: { type: String, required: true },
  
  environmental_impact_details: { type: String },
  emergency_actions_taken: { type: String },
  cleanup_procedure_followed: { type: String },
  
  reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reported_by_name: { type: String },
  incident_date: { type: Date, default: Date.now },
  
  status: {
    type: String,
    enum: ['Reported', 'Investigating', 'Cleanup In Progress', 'Resolved', 'Closed'],
    default: 'Reported'
  },
  
  investigation_notes: { type: String },
  corrective_actions: { type: String },
  
  photos: [{
    url: { type: String },
    caption: { type: String }
  }]
}, { timestamps: true });

wasteSafetyIncidentSchema.pre('validate', async function() {
  if (!this.incident_id) {
    const count = await mongoose.model('WasteSafetyIncident').countDocuments();
    this.incident_id = `INC-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('WasteSafetyIncident', wasteSafetyIncidentSchema);
