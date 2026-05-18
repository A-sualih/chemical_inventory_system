const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  systemName: { type: String, default: 'Chemical Inventory System' },
  systemLogo: { type: String, default: '/default-logo.png' },
  landingHero: { type: String, default: '/landing_hero_illustration_v2_1779104886985.png' },
  favicon: { type: String, default: '' },
  orgName: { type: String, default: 'Default Organization' },
  defaultNotificationSettings: { type: Object, default: { email: true, inApp: true } },
  defaultTheme: { type: String, default: 'light' },
  contactInfo: { type: Object, default: { email: 'admin@example.com', phone: '' } },
  units: { 
    type: Object, 
    default: { 
      volume: 'L', 
      weight: 'kg', 
      temperature: 'C' 
    } 
  },
  alertThresholds: {
    type: Object,
    default: {
      lowStockPercent: 10,
      expiryDaysWarning: 30,
      hazardLimitAlert: true
    }
  },
  generalPreferences: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

