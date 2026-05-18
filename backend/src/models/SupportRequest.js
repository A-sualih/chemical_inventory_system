const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Emergency'],
    default: 'Low' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
