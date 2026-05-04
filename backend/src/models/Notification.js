const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['LOW_STOCK', 'EXPIRY', 'UNAUTHORIZED_ACCESS', 'SYSTEM', 'INFO'],
    required: true
  },
  category: {
    type: String,
    enum: ['inventory', 'safety', 'security', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed'],
    default: 'unread'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String
  }],
  related: {
    chemicalId: String,
    chemicalName: String,
    batchId: String,
    containerId: String,
    locationId: String
  },
  metadata: {
    currentQuantity: Number,
    threshold: Number,
    expiryDate: Date,
    daysRemaining: Number,
    ipAddress: String,
    device: String,
    attemptedAction: String
  },
  channels: [{
    type: {
      type: String,
      enum: ['dashboard', 'email', 'sms']
    },
    isSent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    error: String
  }],
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexing for performance
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ severity: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ 'recipients.userId': 1 });
NotificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);


