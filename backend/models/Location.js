const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  building: { type: String, required: true, trim: true },
  room:     { type: String, required: true, trim: true },
  cabinet:  { type: String, required: true, trim: true },
  shelf:    { type: String, required: true, trim: true },
  capacity:      { type: Number, default: 50 },  // max chemicals this shelf can hold
  current_load:  { type: Number, default: 0 },   // current chemical count
  safety_warnings: { type: String, default: '' },
  notes:    { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Auto-generate a human-readable label
locationSchema.virtual('label').get(function () {
  return `${this.building} / ${this.room} / ${this.cabinet} / Shelf ${this.shelf}`;
});

// Compound unique index: one slot per building+room+cabinet+shelf combination
locationSchema.index({ building: 1, room: 1, cabinet: 1, shelf: 1 }, { unique: true });

module.exports = mongoose.model('Location', locationSchema);
