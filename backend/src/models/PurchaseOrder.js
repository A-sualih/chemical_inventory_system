const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  chemical_name: { type: String, required: true },
  chemical_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chemical' },
  cas_number: { type: String },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  unit_price: { type: Number, required: true },
  total_price: { type: Number, required: true },
  tax_rate: { type: Number, default: 0 },
  received_quantity: { type: Number, default: 0 },
  notes: { type: String }
});

const approvalHistorySchema = new mongoose.Schema({
  action: { type: String }, // 'Approved', 'Rejected', 'Submitted', etc.
  performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performed_by_name: { type: String },
  comment: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const purchaseOrderSchema = new mongoose.Schema({
  po_number: { type: String, required: true, unique: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Legacy field alias kept for backward compat
  ordered_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_by_name: { type: String },
  
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Ordered', 'Partially Received', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  payment_status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid', 'Refunded'],
    default: 'Unpaid'
  },
  delivery_status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'In Transit', 'Delivered', 'Delayed', 'Cancelled'],
    default: 'Pending'
  },

  items: [poItemSchema],
  
  subtotal: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  shipping_fee: { type: Number, default: 0 },
  total_cost: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  
  order_date: { type: Date },
  expected_delivery: { type: Date },
  actual_delivery: { type: Date },
  
  department: { type: String },
  cost_center: { type: String },
  warehouse: { type: String, default: 'Main Warehouse' },
  
  notes: { type: String },
  rejection_reason: { type: String },
  
  // Attached files (invoices, receipts)
  attachments: [{
    name: { type: String },
    file_path: { type: String },
    type: { type: String, enum: ['Invoice', 'Receipt', 'Contract', 'Other'] },
    uploaded_at: { type: Date, default: Date.now }
  }],
  
  // Full audit trail
  approval_history: [approvalHistorySchema],
  
  // Soft delete
  is_deleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Auto-total calculation
purchaseOrderSchema.pre('save', async function() {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total_price, 0);
    this.tax_amount = this.items.reduce((sum, item) => sum + (item.total_price * (item.tax_rate / 100)), 0);
    this.total_cost = this.subtotal + this.tax_amount + (this.shipping_fee || 0);
  }
});

// Indexes
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ supplier_id: 1 });
purchaseOrderSchema.index({ requested_by: 1 });
purchaseOrderSchema.index({ order_date: -1 });
purchaseOrderSchema.index({ is_deleted: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);

