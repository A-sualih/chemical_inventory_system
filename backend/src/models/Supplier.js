const { encrypt, decrypt } = require('../utils/encryption');

const supplierSchema = new mongoose.Schema({
  supplier_id: { type: String, unique: true }, // Auto-generated
  name: { type: String, required: true, trim: true },
  contact_person: { type: String, trim: true },
  contact_email: { type: String, trim: true, lowercase: true },
  contact_phone: { 
    type: String, 
    trim: true,
    set: encrypt,
    get: decrypt
  },
  address: { type: String },
  country: { type: String, default: 'USA' },
  website: { type: String },
  tax_vat_number: { 
    type: String,
    set: encrypt,
    get: decrypt
  },
  category: {
    type: String,
    enum: ['Chemical Manufacturer', 'Distributor', 'Wholesaler', 'Laboratory Supplier', 'Specialty Chemical', 'Raw Materials', 'Other'],
    default: 'Distributor'
  },
  chemical_types_supplied: [{ type: String }], // e.g. ['Acids', 'Solvents', 'Reagents']
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Blacklisted'],
    default: 'Active'
  },
  is_preferred: { type: Boolean, default: false },
  notes: { type: String },
  // Documents/contracts (stored as file paths)
  documents: [{
    name: { type: String },
    file_path: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  }],
  // Performance Metrics (auto-calculated)
  rating: { type: Number, min: 0, max: 5, default: 0 },
  total_orders: { type: Number, default: 0 },
  total_spending: { type: Number, default: 0 },
  average_lead_time_days: { type: Number, default: 0 },
  on_time_delivery_rate: { type: Number, default: 100 }, // Percentage
  order_accuracy_rate: { type: Number, default: 100 },
  quality_score: { type: Number, min: 0, max: 5, default: 5 },
  reliability_score: { type: Number, min: 0, max: 100, default: 100 },
  delayed_orders: { type: Number, default: 0 },
  rejected_shipments: { type: Number, default: 0 },
  // Contract info
  contract_expiry: { type: Date },
  // Soft delete
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Auto-generate supplier_id before save
supplierSchema.pre('save', async function() {
  if (!this.supplier_id) {
    const count = await mongoose.model('Supplier').countDocuments();
    this.supplier_id = `SUP-${String(count + 1).padStart(4, '0')}`;
  }
});

// Indexes for frequent queries
supplierSchema.index({ name: 'text', country: 'text', category: 'text' });
supplierSchema.index({ status: 1 });
supplierSchema.index({ is_deleted: 1 });
supplierSchema.index({ is_preferred: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
