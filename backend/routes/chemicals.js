const express = require('express');
const Chemical = require('../models/Chemical');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const router = express.Router();

// Get stats for Dashboard
router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalCount = await Chemical.countDocuments({ archived: false });
    const flammables = await Chemical.countDocuments({ ghs_classes: '0', archived: false });
    const lowStock = await Chemical.countDocuments({ status: "Low Stock", archived: false });
    
    const stats = {
      total: totalCount,
      flammables: flammables,
      lowStock: lowStock,
      auditScore: "94%"
    };
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all non-archived chemicals
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const chemicals = await Chemical.find({ archived: false }).sort({ createdAt: -1 });
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new chemical
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), async (req, res) => {
  const data = req.body;
  
  try {
    const count = await Chemical.countDocuments({});
    const idValue = `C${String(count + 1).padStart(3, '0')}`;
    
    const newChem = new Chemical({
      id: idValue,
      name: data.name,
      iupac_name: data.iupac,
      cas_number: data.cas,
      formula: data.formula,
      quantity: data.quantity,
      unit: data.unit,
      state: data.state,
      purity: data.purity,
      storage_temp: data.storageTemp,
      storage_humidity: data.storageHumidity,
      supplier: data.supplier,
      batch_number: data.batch,
      expiry_date: data.expiry,
      ghs_classes: data.ghs || [],
      sds_attached: !!data.sdsAttached,
      location: data.location || 'Pending Assignment',
      status: 'In Stock'
    });

    await newChem.save();
    
    // Log Audit
    await logAudit(req, 'Created Chemical', `Added new chemical: ${newChem.name} (${newChem.id})`, 'Chemical', newChem._id);

    res.status(201).json(newChem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a chemical
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), async (req, res) => {
  const id = req.params.id; 
  const data = req.body;

  try {
    const chemical = await Chemical.findOne({ id: id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    const oldName = chemical.name;
    chemical.name = data.name;
    chemical.iupac_name = data.iupac;
    chemical.cas_number = data.cas;
    // ... other fields update ...
    chemical.formula = data.formula;
    chemical.quantity = data.quantity;
    chemical.unit = data.unit;
    chemical.state = data.state;
    chemical.purity = data.purity;
    chemical.storage_temp = data.storageTemp;
    chemical.storage_humidity = data.storageHumidity;
    chemical.supplier = data.supplier;
    chemical.batch_number = data.batch;
    chemical.expiry_date = data.expiry;
    chemical.ghs_classes = data.ghs || [];
    chemical.sds_attached = !!data.sdsAttached;

    await chemical.save();

    // Log Audit
    await logAudit(req, 'Updated Chemical', `Updated chemical information for ${oldName} (${chemical.id})`, 'Chemical', chemical._id);

    res.json({ message: 'Updated successfully', chemical });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive (Soft Delete) chemical
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    chemical.archived = true;
    chemical.status = 'Archived';
    await chemical.save();

    // Log Audit
    await logAudit(req, 'Archived Chemical', `Archived chemical: ${chemical.name} (${chemical.id})`, 'Chemical', chemical._id);

    res.json({ message: 'Archived successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
