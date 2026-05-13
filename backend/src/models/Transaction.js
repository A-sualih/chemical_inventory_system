const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_id: { type: String, unique: true },
  type: { type: String, enum: ['Check-Out', 'Check-In'], required: true },
  chemical_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chemical', required: true },
  chemical_name: { type: String },
  container_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: true },
  container_barcode: { type: String },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_name: { type: String },
  lab_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  
  // For Check-In, track the original checkout
  original_checkout_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
  
  safety_verification: {
    ppe_worn: { type: Boolean, default: false },
    hazard_acknowledged: { type: Boolean, default: false },
    safe_handling_verified: { type: Boolean, default: false }
  },
  
  environmental_conditions: {
    temperature: { type: Number },
    humidity: { type: Number }
  },
  
  location_snapshot: {
    building: String,
    room: String,
    cabinet: String
  },

  notes: { type: String },
  device_info: {
    type: String, // 'Desktop', 'Mobile', 'Scanner'
    id: String
  }
}, { timestamps: true });

// Generate friendly transaction ID
transactionSchema.pre('save', async function(next) {
  if (!this.transaction_id) {
    const count = await mongoose.model('Transaction').countDocuments();
    const prefix = this.type === 'Check-Out' ? 'CO' : 'CI';
    this.transaction_id = `${prefix}-${Date.now().toString().slice(-6)}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
