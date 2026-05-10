const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  systemName: { type: String, default: 'Chemical Inventory System' },
  systemLogo: { type: String, default: '/default-logo.png' },
  favicon: { type: String, default: '' },
  orgName: { type: String, default: 'Default Organization' },
  defaultNotificationSettings: { type: Object, default: { email: true, inApp: true } },
  defaultTheme: { type: String, default: 'light' },
  contactInfo: { type: Object, default: { email: 'admin@example.com', phone: '' } },
  generalPreferences: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
