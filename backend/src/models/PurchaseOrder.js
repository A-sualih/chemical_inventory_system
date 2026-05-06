const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  chemical_name: { type: String, required: true },
  chemical_id: { type: String }, // Optional link to existing chemical
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  unit_price: { type: Number, required: true },
  total_price: { type: Number, required: true }
});

const purchaseOrderSchema = new mongoose.Schema({
  po_number: { type: String, required: true, unique: true },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  status: { 
    type: String, 
    enum: ['Draft', 'Pending Approval', 'Approved', 'Ordered', 'In Transit', 'Partially Received', 'Received', 'Cancelled'],
    default: 'Draft' 
  },
  ordered_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [poItemSchema],
  total_cost: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  order_date: { type: Date },
  expected_delivery: { type: Date },
  actual_delivery: { type: Date },
  notes: { type: String },
  // Cost tracking categories
  department_budget: { type: String },
  cost_center: { type: String }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
