const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  barcode: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  action: { 
    type: String, 
    enum: ['Lookup', 'Checkout', 'Checkin', 'Relocate', 'Enrollment'],
    default: 'Lookup' 
  },
  status: { type: String, enum: ['Success', 'Not Found', 'Error'], default: 'Success' },
  metadata: {
    device: { type: String },
    os: { type: String },
    location: { type: String },
    ip: { type: String }
  },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' }
}, { timestamps: true });

// Index for rapid history lookup by user or barcode
scanHistorySchema.index({ userId: 1, timestamp: -1 });
scanHistorySchema.index({ barcode: 1 });
scanHistorySchema.index({ labId: 1 });

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
