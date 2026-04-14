const express = require('express');
const Chemical = require('../models/Chemical');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const { convertToBase, getBaseUnit } = require('../utils/unitConverter');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, `sds-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

const router = express.Router();

// Get stats for Dashboard (comprehensive)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalCount = await Chemical.countDocuments({ archived: false });
    const flammables = await Chemical.countDocuments({ ghs_classes: '0', archived: false });
    const lowStock = await Chemical.countDocuments({ status: "Low Stock", archived: false });
    
    // Upcoming expirations (within 90 days)
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiring = await Chemical.find({
      archived: false,
      expiry_date: { $gte: now, $lte: in90Days }
    }).sort({ expiry_date: 1 }).limit(5).select('name expiry_date ghs_classes location');

    const expirations = expiring.map(c => {
      const daysLeft = Math.ceil((new Date(c.expiry_date) - now) / (1000 * 60 * 60 * 24));
      return { name: c.name, days: daysLeft, location: c.location || 'Unassigned' };
    });

    // Storage breakdown by location
    const allChemicals = await Chemical.find({ archived: false }).select('location quantity');
    const locationMap = {};
    allChemicals.forEach(c => {
      const loc = c.location || 'Unassigned';
      if (!locationMap[loc]) locationMap[loc] = { count: 0, totalQty: 0 };
      locationMap[loc].count += 1;
      locationMap[loc].totalQty += (c.quantity || 0);
    });
    const storageBreakdown = Object.entries(locationMap)
      .map(([name, data]) => ({ name, count: data.count, totalQty: data.totalQty }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    // Last audit timestamp
    const AuditLog = require('../models/AuditLog');
    const lastAudit = await AuditLog.findOne().sort({ timestamp: -1 }).select('timestamp');
    let lastAuditAgo = 'Never';
    if (lastAudit) {
      const diffH = Math.floor((now - new Date(lastAudit.timestamp)) / (1000 * 60 * 60));
      lastAuditAgo = diffH < 1 ? 'Just now' : diffH < 24 ? `${diffH}h ago` : `${Math.floor(diffH / 24)}d ago`;
    }

    // Safety audit score (percentage of chemicals with SDS attached)
    const withSds = await Chemical.countDocuments({ archived: false, sds_attached: true });
    const auditScore = totalCount > 0 ? Math.round((withSds / totalCount) * 100) + '%' : 'N/A';

    const stats = {
      total: totalCount,
      flammables,
      lowStock,
      auditScore,
      expirations,
      storageBreakdown,
      lastAuditAgo
    };
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all chemicals (active and archived)
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const chemicals = await Chemical.find({}).sort({ createdAt: -1 });
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new chemical
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), upload.single('sds_file'), async (req, res) => {
  const data = req.body;
  
  const casRegex = /^\d{2,7}-\d{2}-\d$/;
  if (data.cas && !casRegex.test(data.cas)) {
    return res.status(400).json({ error: 'Invalid CAS number format.' });
  }

  let parsedGhs = data.ghs;
  if (typeof parsedGhs === 'string') {
    try { parsedGhs = JSON.parse(parsedGhs); } catch (e) { parsedGhs = []; }
  }

  try {
    // Generate a guaranteed unique ID
    let isUnique = false;
    const baseCount = await Chemical.countDocuments({});
    let attempt = baseCount + 1;
    let idValue = '';
    
    while (!isUnique) {
      idValue = `C${String(attempt).padStart(3, '0')}`;
      const existing = await Chemical.findOne({ id: idValue });
      if (!existing) {
        isUnique = true;
      } else {
        attempt++;
      }
    }
    
    // Check if new file was attached
    const hasSdsFile = !!req.file;
    const sdsFileName = hasSdsFile ? req.file.originalname : undefined;
    const sdsFileUrl = hasSdsFile ? `/uploads/${req.file.filename}` : undefined;
    
    const newChem = new Chemical({
      id: idValue,
      name: data.name,
      iupac_name: data.iupac,
      cas_number: data.cas,
      formula: data.formula,
      quantity: Number(data.quantity) || 0,
      unit: data.unit,
      base_quantity: convertToBase(Number(data.quantity) || 0, data.unit),
      base_unit: getBaseUnit(data.unit),
      state: data.state,
      purity: data.purity,
      concentration: data.concentration,
      storage_temp: data.storageTemp,
      storage_humidity: data.storageHumidity,
      supplier: data.supplier,
      batch_number: data.batch,
      expiry_date: data.expiry,
      ghs_classes: parsedGhs || [],
      sds_attached: hasSdsFile || data.sdsAttached === 'true',
      sds_file_name: sdsFileName,
      sds_file_url: sdsFileUrl,
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
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), upload.single('sds_file'), async (req, res) => {
  const id = req.params.id; 
  const data = req.body;

  const casRegex = /^\d{2,7}-\d{2}-\d$/;
  if (data.cas && !casRegex.test(data.cas)) {
    return res.status(400).json({ error: 'Invalid CAS number format.' });
  }

  let parsedGhs = data.ghs;
  if (typeof parsedGhs === 'string') {
    try { parsedGhs = JSON.parse(parsedGhs); } catch (e) { parsedGhs = []; }
  }

  try {
    const chemical = await Chemical.findOne({ id: id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    const oldName = chemical.name;
    chemical.name = data.name;
    chemical.iupac_name = data.iupac;
    chemical.cas_number = data.cas;
    chemical.formula = data.formula;
    chemical.quantity = Number(data.quantity) || 0;
    chemical.unit = data.unit;
    chemical.base_quantity = convertToBase(chemical.quantity, chemical.unit);
    chemical.base_unit = getBaseUnit(chemical.unit);
    chemical.state = data.state;
    chemical.purity = data.purity;
    chemical.concentration = data.concentration;
    chemical.storage_temp = data.storageTemp;
    chemical.storage_humidity = data.storageHumidity;
    chemical.supplier = data.supplier;
    chemical.batch_number = data.batch;
    chemical.expiry_date = data.expiry;
    chemical.location = data.location || chemical.location;
    chemical.ghs_classes = parsedGhs || [];
    
    if (req.file) {
      chemical.sds_attached = true;
      chemical.sds_file_name = req.file.originalname;
      chemical.sds_file_url = `/uploads/${req.file.filename}`;
    } else {
      chemical.sds_attached = data.sdsAttached === 'true' || chemical.sds_attached;
    }

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

// Restore Archived chemical
router.put('/:id/restore', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    chemical.archived = false;
    chemical.status = 'In Stock';
    await chemical.save();

    // Log Audit
    await logAudit(req, 'Restored Chemical', `Restored chemical from archive: ${chemical.name} (${chemical.id})`, 'Chemical', chemical._id);

    res.json({ message: 'Restored successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate QR Code for a chemical
router.get('/:id/qrcode', authenticate, async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    // Data encoded into the QR code
    const qrData = `CIMS:${chemical.id}|CAS:${chemical.cas_number || 'N/A'}|${chemical.name}`;
    const qrImage = await QRCode.toDataURL(qrData);
    
    res.json({ qrCode: qrImage });
  } catch (err) {
    res.status(500).json({ error: 'QR Generation failed' });
  }
});

module.exports = router;
