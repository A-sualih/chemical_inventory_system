const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    role: { type: String, required: true },
    email: { type: String }
  },
  action: { 
    type: String, 
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'TRANSFER', 'DISPOSAL', 'LOGIN', 'LOGOUT']
  },
  target: {
    type: { type: String, required: true, enum: ['chemical', 'batch', 'stock', 'request', 'user', 'location', 'container'] },
    id: { type: String }, // This can be the internal _id or a human-readable ID
    name: { type: String }
  },
  details: { type: String, required: true },
  changes: {
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed }
  },
  metadata: {
    ip: { type: String },
    userAgent: { type: String },
    device: { type: String },
    status: { type: String, default: 'success' }
  },
  timestamp: { type: Date, default: Date.now }
});

// Indexing for faster filtering
auditLogSchema.index({ 'user.id': 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ 'target.type': 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);


