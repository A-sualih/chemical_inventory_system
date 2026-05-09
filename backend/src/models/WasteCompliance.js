const mongoose = require('mongoose');

const wasteComplianceSchema = new mongoose.Schema({
  log_id: { type: String, required: true, unique: true },
  disposal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'WasteDisposal' },
  
  type: { 
    type: String, 
    enum: ['Manifest', 'Inspection', 'Violation', 'Corrective Action', 'Permit Update', 'Government Report'],
    required: true 
  },
  
  status: { 
    type: String, 
    enum: ['Active', 'Pending Review', 'Resolved', 'Closed', 'Archived'],
    default: 'Active'
  },
  
  title: { type: String, required: true },
  description: { type: String },
  regulatory_body: { type: String }, // e.g. EPA, OSHA
  reference_number: { type: String },
  
  recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  event_date: { type: Date, default: Date.now },
  deadline: { type: Date }, // For corrective actions
  
  documents: [{
    name: { type: String },
    url: { type: String },
    type: { type: String } // Manifest, Certificate, etc.
  }],
  
  digital_signature: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    timestamp: { type: Date }
  },
  
  notes: { type: String }
}, { timestamps: true });

wasteComplianceSchema.pre('validate', async function() {
  if (!this.log_id) {
    const count = await mongoose.model('WasteCompliance').countDocuments();
    this.log_id = `COMP-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('WasteCompliance', wasteComplianceSchema);
