const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Viewer / Auditor' },
  status: { type: String, default: 'Active' },
  failed_attempts: { type: Number, default: 0 },
  locked_until: { type: Date },
  mfa_type: { type: String, default: 'email' },
  mfa_secret: { type: String },
  mfa_temp_secret: { type: String },
  mfa_phone: { type: String },
  mfa_enabled: { type: Boolean, default: true },
  phone: { type: String, default: '' },
  profile_photo: { type: String, default: '' },
  email_preferences: { type: Object, default: { alerts: true, updates: false } },
  otp: { type: String },
  otpExpiry: { type: Date },
  resetToken: { type: String },
  resetTokenExpire: { type: Date },
  labs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lab' }],
  active_lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);



