const mongoose = require('mongoose');

const vendorPerformanceSchema = new mongoose.Schema({
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewed_by_name: { type: String },

  // Scoring (1–5)
  delivery_punctuality: { type: Number, min: 1, max: 5, required: true },
  order_accuracy: { type: Number, min: 1, max: 5, required: true },
  chemical_quality: { type: Number, min: 1, max: 5, required: true },
  communication: { type: Number, min: 1, max: 5, required: true },
  safety_compliance: { type: Number, min: 1, max: 5, required: true },

  // Computed average
  overall_rating: { type: Number, min: 1, max: 5 },

  // Flags
  was_on_time: { type: Boolean, default: true },
  had_damaged_goods: { type: Boolean, default: false },
  had_quantity_mismatch: { type: Boolean, default: false },
  shipment_rejected: { type: Boolean, default: false },

  // Incident / comments
  incident_description: { type: String },
  comments: { type: String },

  review_date: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-calculate overall_rating before save
vendorPerformanceSchema.pre('save', async function() {
  const scores = [
    this.delivery_punctuality,
    this.order_accuracy,
    this.chemical_quality,
    this.communication,
    this.safety_compliance
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  this.overall_rating = Math.round(avg * 10) / 10;
});

vendorPerformanceSchema.index({ supplier_id: 1 });
vendorPerformanceSchema.index({ review_date: -1 });

module.exports = mongoose.model('VendorPerformance', vendorPerformanceSchema);
