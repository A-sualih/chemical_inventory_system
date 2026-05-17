const mongoose = require('mongoose');

const shipmentTrackingSchema = new mongoose.Schema({
  purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  tracking_number: { type: String },
  carrier: { type: String },

  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Cancelled', 'Returned'],
    default: 'Pending'
  },

  shipped_date: { type: Date },
  estimated_arrival: { type: Date },
  actual_arrival: { type: Date },

  origin_address: { type: String },
  destination_address: { type: String },
  destination_warehouse: { type: String, default: 'Main Warehouse' },

  // Timeline events
  timeline: [{
    status: { type: String },
    location: { type: String },
    description: { type: String },
    timestamp: { type: Date, default: Date.now },
    recorded_by: { type: String }
  }],

  // Receiving
  received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  received_by_name: { type: String },
  received_date: { type: Date },

  // Condition on arrival
  condition: {
    type: String,
    enum: ['Good', 'Partially Damaged', 'Fully Damaged', 'Quantity Mismatch', 'Pending Inspection'],
    default: 'Pending Inspection'
  },
  damage_description: { type: String },
  quantity_mismatch_details: { type: String },

  // Partial delivery support
  is_partial: { type: Boolean, default: false },
  partial_delivery_notes: { type: String },

  is_delayed: { type: Boolean, default: false },
  delay_reason: { type: String },

  notes: { type: String }
}, { timestamps: true });

shipmentTrackingSchema.index({ purchase_order_id: 1 });
shipmentTrackingSchema.index({ status: 1 });
shipmentTrackingSchema.index({ tracking_number: 1 });

module.exports = mongoose.model('ShipmentTracking', shipmentTrackingSchema);

