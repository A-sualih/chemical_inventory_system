const express = require('express');
const Chemical = require('../models/Chemical');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const { convertToBase, getBaseUnit } = require('../utils/unitConverter');
const { syncBatch } = require('../utils/batchManager');
const { syncContainers } = require('../utils/containerManager');

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
    const flammables = await Chemical.countDocuments({ ghs_classes: "Flammable", archived: false });
    
    // Comprehensive hazard distribution
    const allHazards = await Chemical.aggregate([
      { $match: { archived: false } },
      { $unwind: "$ghs_classes" },
      { $group: { _id: "$ghs_classes", count: { $sum: 1 } } }
    ]);
    const hazardSummary = allHazards.map(h => ({ id: h._id, count: h.count }));
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
      hazardSummary,
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

// Get all chemicals with advanced search and filtering
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const { 
      search, 
      hazard, 
      status, 
      building, 
      room, 
      cabinet, 
      shelf,
      expiryStatus,
      archived,
      page = 1, 
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query = { archived: archived === 'true' };


    // 1. Text Search (with regex escaping for safety)
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { iupac_name: { $regex: escapedSearch, $options: 'i' } },
        { cas_number: { $regex: escapedSearch, $options: 'i' } },
        { id: { $regex: escapedSearch, $options: 'i' } },
        { formula: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    // 2. Hazard Filter (GHS)
    const hazardParam = hazard || req.query['hazard[]'];
    if (hazardParam) {
      const hazards = Array.isArray(hazardParam) ? hazardParam.filter(Boolean) : [hazardParam].filter(Boolean);
      if (hazards.length > 0) {
        query.ghs_classes = { $in: hazards };
      }
    }

    // 3. Status Filter
    const statusParam = status || req.query['status[]'];
    if (statusParam) {
      const statuses = Array.isArray(statusParam) ? statusParam.filter(Boolean) : [statusParam].filter(Boolean);
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
    }

    // 4. Hierarchical Location Filter
    if (building) query.building = building;
    if (room) query.room = room;
    if (cabinet) query.cabinet = cabinet;
    if (shelf) query.shelf = shelf;

    // 5. Expiry Status Filter (calculated status)
    if (expiryStatus) {
      query.status = expiryStatus;
    }

    // Pagination & Sorting (with safety defaults)
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const skip = (p - 1) * l;
    
    const sort = {};
    const validSortFields = ['name', 'createdAt', 'expiry_date', 'quantity', 'status', 'id'];
    const sField = validSortFields.includes(sortBy) ? sortBy : 'name';
    sort[sField] = sortOrder === 'desc' ? -1 : 1;

    const chemicals = await Chemical.find(query)
      .sort(sort)
      .skip(skip)
      .limit(l);

    const total = await Chemical.countDocuments(query);

    res.json({
      data: chemicals,
      total,
      page: p,
      totalPages: Math.ceil(total / l)
    });
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    res.status(500).json({ 
      error: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
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
      iupac_name: data.iupac_name || data.iupac,
      cas_number: data.cas_number || data.cas,
      formula: data.formula,
      quantity: Number(data.quantity) || 0,
      unit: data.unit,
      base_quantity: convertToBase(Number(data.quantity) || 0, data.unit),
      base_unit: getBaseUnit(data.unit),
      state: data.state,
      purity: data.purity,
      concentration: data.concentration,
      storage_temp: data.storage_temp || data.storageTemp,
      storage_humidity: data.storage_humidity || data.storageHumidity,
      supplier: data.supplier,
      batch_number: data.batch_number || data.batch,
      manufacturing_date: data.manufacturing_date || data.mfgDate,
      purchase_date: data.purchase_date || data.purchaseDate,
      expiry_date: data.expiry_date || data.expiry,
      num_containers: Number(data.num_containers || data.numContainers) || 1,
      quantity_per_container: Number(data.quantity_per_container || data.qtyPerContainer),
      container_type: data.container_type || data.containerType,
      container_id_series: data.container_id_series || data.containerId,
      building: data.building,
      room: data.room,
      cabinet: data.cabinet,
      shelf: data.shelf,
      remarks: data.remarks,
      ghs_classes: parsedGhs || [],
      sds_attached: hasSdsFile || data.sdsAttached === 'true',
      sds_file_name: sdsFileName,
      sds_file_url: sdsFileUrl,
      location: data.building ? `${data.building}-${data.room || ''}-${data.cabinet || ''}-${data.shelf || ''}`.replace(/-+$/, '') : (data.location || 'Pending Assignment'),
      status: 'In Stock'
    });

    await newChem.save();

    // Auto-Sync Batch record
    if (newChem.batch_number) {
      await syncBatch({
        ...data,
        id: idValue,
        quantity: Number(data.quantity)
      });
    }

    // Auto-Sync Containers
    await syncContainers({
      ...data,
      id: idValue,
    });
    
    // Log Audit
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'chemical',
      targetId: newChem.id,
      targetName: newChem.name,
      details: `Added new chemical: ${newChem.name} (${newChem.id})`
    });

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
    chemical.iupac_name = data.iupac_name || data.iupac;
    chemical.cas_number = data.cas_number || data.cas;
    chemical.formula = data.formula;
    chemical.quantity = Number(data.quantity) || 0;
    chemical.unit = data.unit;
    chemical.base_quantity = convertToBase(chemical.quantity, chemical.unit);
    chemical.base_unit = getBaseUnit(chemical.unit);
    chemical.state = data.state;
    chemical.purity = data.purity;
    chemical.concentration = data.concentration;
    chemical.storage_temp = data.storage_temp || data.storageTemp;
    chemical.storage_humidity = data.storage_humidity || data.storageHumidity;
    chemical.supplier = data.supplier;
    chemical.batch_number = data.batch_number || data.batch;
    chemical.manufacturing_date = data.manufacturing_date || data.mfgDate;
    chemical.purchase_date = data.purchase_date || data.purchaseDate;
    chemical.expiry_date = data.expiry_date || data.expiry;
    chemical.num_containers = Number(data.num_containers || data.numContainers) || 1;
    chemical.quantity_per_container = Number(data.quantity_per_container || data.qtyPerContainer);
    chemical.container_type = data.container_type || data.containerType;
    chemical.container_id_series = data.container_id_series || data.containerId;
    chemical.building = data.building;
    chemical.room = data.room;
    chemical.cabinet = data.cabinet;
    chemical.shelf = data.shelf;
    chemical.remarks = data.remarks;
    chemical.location = data.building ? `${data.building}-${data.room || ''}-${data.cabinet || ''}-${data.shelf || ''}`.replace(/-+$/, '') : (data.location || chemical.location);
    chemical.ghs_classes = parsedGhs || [];
    
    if (req.file) {
      chemical.sds_attached = true;
      chemical.sds_file_name = req.file.originalname;
      chemical.sds_file_url = `/uploads/${req.file.filename}`;
    } else {
      chemical.sds_attached = data.sds_attached === 'true' || chemical.sds_attached;
    }

    await chemical.save();

    // Auto-Sync Batch record
    if (chemical.batch_number) {
      await syncBatch({
        ...chemical.toObject(),
        id: chemical.id
      });
    }

    // Auto-Sync Containers
    await syncContainers({
      ...chemical.toObject(),
      id: chemical.id
    });

    // Auto-Cascade Expiry Date & Status to Batches and Containers
    const expiryToUse = data.expiry_date || data.expiry;
    if (expiryToUse) {
      const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
      const exp = new Date(expiryToUse);
      const now = new Date();
      const diff = (exp - now) / (1000 * 60 * 60 * 24);
      let newExpStatus = null;
      if (diff < 0) newExpStatus = 'Expired';
      else if (diff <= thresholdDays) newExpStatus = 'Near Expiry';


      // 1. Update Batches
      const batches = await require('../models/Batch').find({ chemical_id: chemical.id });
      for (let b of batches) {
         b.expiry_date = expiryToUse;
         if (newExpStatus) {
            b.status = newExpStatus;
         } else if (['Near Expiry', 'Expired'].includes(b.status)) {
            b.status = 'Active';
         }
         await b.save();
      }

      // 2. Update Containers
      const containers = await require('../models/Container').find({ chemical_id: chemical.id });
      for (let c of containers) {
         c.expiry_date = expiryToUse;
         if (!['Empty', 'Damaged'].includes(c.status)) {
            if (newExpStatus) {
               c.status = newExpStatus;
            } else if (['Near Expiry', 'Expired'].includes(c.status)) {
               c.status = 'Full';
            }
         }
         await c.save();
      }
    }

    // Log Audit
    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Updated chemical information for ${oldName} (${chemical.id})`
    });

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
    await logAudit(req, {
      action: 'DELETE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Archived (soft deleted) chemical: ${chemical.name} (${chemical.id})`
    });

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
    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Restored chemical from archive: ${chemical.name} (${chemical.id})`
    });

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
