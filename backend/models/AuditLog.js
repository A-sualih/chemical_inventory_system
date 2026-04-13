const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_email: { type: String },
  action: { type: String, required: true },
  details: { type: String },
  resource: { type: String },
  resource_id: { type: String },
  ip_address: { type: String },
  user_agent: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
