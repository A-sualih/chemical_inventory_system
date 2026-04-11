const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  building: { type: String },
  room: { type: String },
  cabinet: { type: String },
  shelf: { type: String },
  capacity: { type: Number },
  current_load: { type: Number, default: 0 },
  safety_warnings: { type: String }
});

module.exports = mongoose.model('Location', locationSchema);
