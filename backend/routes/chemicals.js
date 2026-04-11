const express = require('express');
const Chemical = require('../models/Chemical');
const { authenticate, requireRole, ROLES } = require('../authMiddleware');

const router = express.Router();

// Get stats for Dashboard
router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalCount = await Chemical.countDocuments({ archived: false });
    // Quick hack: find if ghs_classes contains index 0 (Flame)
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
router.get('/', authenticate, async (req, res) => {
  try {
    const chemicals = await Chemical.find({ archived: false }).sort({ createdAt: -1 });
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new chemical (Manager, Tech, Admin)
router.post('/', authenticate, requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER, ROLES.LAB_TECHNICIAN]), async (req, res) => {
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
    res.status(201).json(newChem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a chemical (Admin, Manager, Tech)
router.put('/:id', authenticate, requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER, ROLES.LAB_TECHNICIAN]), async (req, res) => {
  const id = req.params.id; // This is the 'id' field, not _id
  const data = req.body;

  try {
    const chemical = await Chemical.findOne({ id: id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    chemical.name = data.name;
    chemical.iupac_name = data.iupac;
    chemical.cas_number = data.cas;
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
    res.json({ message: 'Updated successfully', chemical });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive (Soft Delete) chemical (Admin, Manager ONLY)
router.delete('/:id', authenticate, requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER]), async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    chemical.archived = true;
    chemical.status = 'Archived';
    await chemical.save();

    res.json({ message: 'Archived successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
