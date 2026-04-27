const mongoose = require('mongoose');

const chemicalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  name: { type: String, required: true },
  iupac_name: { type: String },
  cas_number: { type: String },
  formula: { type: String },
  quantity: { type: Number },
  unit: { type: String },
  base_quantity: { type: Number }, 
  base_unit: { type: String },
  state: { type: String },
  purity: { type: String },
  concentration: { type: String },
  storage_temp: { type: String },
  storage_humidity: { type: String },
  supplier: { type: String },
  batch_number: { type: String },
  manufacturing_date: { type: String },
  purchase_date: { type: String },
  expiry_date: { type: String },
  num_containers: { type: Number, default: 1 },
  quantity_per_container: { type: Number },
  container_type: { type: String },
  container_id_series: { type: String },
  building: { type: String },
  room: { type: String },
  cabinet: { type: String },
  shelf: { type: String },
  remarks: { type: String },
  ghs_classes: [{ type: String }],
 
  sds_attached: { type: Boolean },
  sds_file_name: { type: String },
  sds_file_url: { type: String },
  location: { type: String },
  status: { type: String },
  threshold: { type: Number, default: 5 },
  archived: { type: Boolean, default: false }
}, { timestamps: true });


module.exports = mongoose.model('Chemical', chemicalSchema);
