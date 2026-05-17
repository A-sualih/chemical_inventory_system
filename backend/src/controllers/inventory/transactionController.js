const Transaction = require('../../models/Transaction');
const mongoose = require('mongoose');
const Chemical = require('../../models/Chemical');
const Container = require('../../models/Container');
const AuditLog = require('../../models/AuditLog');
const Notification = require('../../models/Notification');
const { convertToBase, convertFromBase } = require('../../utils/unitConverter');

/**
 * Instant detection via barcode/QR/RFID
 */
exports.getChemicalByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    
    // Normalize function to help with URL-based barcodes (strip protocol and trailing slash)
    const normalize = (val) => val ? val.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') : val;
    const normalizedBarcode = normalize(barcode);

    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };

    // 1. Primary Lookup: Container
    // We check both exact match and normalized match
    let container = await Container.findOne({ 
      ...labQuery,
      $or: [
        { container_id: barcode }, 
        { barcode: barcode },
        { barcode: normalizedBarcode }
      ] 
    });
    
    let chemical;

    if (!container) {
      // Fallback 1: Check if this is a Chemical system ID or CAS number
      chemical = await Chemical.findOne({ ...labQuery, $or: [{ id: barcode }, { cas_number: barcode }] }).populate('lab', 'name');

      // Fallback 2: Check if this matches a manufacturer barcode (exact or normalized)
      if (!chemical) {
        chemical = await Chemical.findOne({ 
          ...labQuery,
          $or: [
            { barcode: barcode },
            { barcode: normalizedBarcode }
          ]
        }).populate('lab', 'name');
      }
      
      if (chemical) {
        // Find the first available container for this chemical
        container = await Container.findOne({ 
          ...labQuery,
          chemical_id: { $in: [chemical.id, chemical._id.toString()] }, 
          status: { $ne: 'Empty' } 
        });
        if (!container) {
            return res.status(404).json({ error: `Chemical found (${chemical.name}), but no active containers are available for check-out.` });
        }
      } else {
        return res.status(404).json({ error: 'Barcode not recognized as a Container, Chemical ID, or Manufacturer Barcode.' });
      }
    } else {
      // Container found, now get its chemical
      const chemId = container.chemical_id;
      const chemQuery = mongoose.Types.ObjectId.isValid(chemId) ? { $or: [{ _id: chemId }, { id: chemId }] } : { id: chemId };
      chemical = await Chemical.findOne({ ...labQuery, ...chemQuery }).populate('lab', 'name');
      if (!chemical) {
        return res.status(404).json({ error: 'Associated chemical record missing for this container.' });
      }
    }

    // Safety & Stock Check
    const warnings = [];
    if (chemical.expiry_date && new Date(chemical.expiry_date) < new Date()) {
      warnings.push('EXPIRED: This chemical is past its expiry date.');
    }
    if (chemical.hazard_summary?.health || chemical.hazard_summary?.physical) {
      warnings.push('HAZARDOUS: PPE required for handling.');
    }

    res.json({
      container: {
        _id: container._id,
        container_id: container.container_id,
        quantity: container.quantity,
        unit: container.unit,
        status: container.status,
        location: container.location
      },
      chemical: {
        _id: chemical._id,
        id: chemical.id,
        name: chemical.name,
        formula: chemical.formula,
        cas_number: chemical.cas_number,
        category: chemical.ghs_hazards?.categories?.[0] || chemical.chemical_family || 'N/A',
        lab_name: chemical.lab?.name || 'N/A',
        status: chemical.status,
        hazard_summary: chemical.hazard_summary,
        ppe_requirements: chemical.ppe_requirements,
        incompatibility: chemical.incompatibility,
        emergency_instructions: chemical.emergency_instructions,
        emergency_response: chemical.emergency_response,
        ghs_hazards: chemical.ghs_hazards,
        nfpa_rating: chemical.nfpa_rating,
        storage_temp: chemical.storage_temp,
        storage_humidity: chemical.storage_humidity,
        spill_instructions: chemical.spill_instructions,
        sds_file_url: chemical.sds_file_url,
        sds_docs: chemical.sds_docs
      },
      warnings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * High-speed Check-Out
 */
exports.checkOut = async (req, res) => {
  try {
    const { 
      container_id, 
      quantity, 
      unit, 
      notes, 
      safety_verified,
      device_info
    } = req.body;

    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };

    const container = await Container.findOne({ ...labQuery, _id: container_id });
    if (!container) return res.status(404).json({ error: 'Container not found' });
    
    // Explicitly fetch chemical document safely
    const chemId = container.chemical_id;
    const chemQuery = mongoose.Types.ObjectId.isValid(chemId) ? { $or: [{ _id: chemId }, { id: chemId }] } : { id: chemId };
    const chemical = await Chemical.findOne({ ...labQuery, ...chemQuery });
    if (!chemical) return res.status(404).json({ error: 'Associated chemical record missing.' });
    
    // 1. Validation
    const requestedQtyBase = convertToBase(quantity, unit);
    const availableQtyBase = convertToBase(container.quantity, container.unit);
    
    if (requestedQtyBase > availableQtyBase + 0.0001) {
      return res.status(400).json({ error: `Insufficient stock in container. Available: ${container.quantity} ${container.unit}` });
    }

    // 2. Create Transaction
    const transaction = new Transaction({
      type: 'Check-Out',
      chemical_id: chemical._id,
      chemical_name: chemical.name,
      container_id: container._id,
      container_barcode: container.container_id,
      user_id: req.user.id,
      user_name: req.user.name,
      lab_id: req.user.active_lab,
      quantity,
      unit,
      safety_verification: safety_verified,
      notes,
      device_info,
      location_snapshot: {
        building: chemical.building,
        room: chemical.room,
        cabinet: chemical.cabinet
      }
    });

    // 3. Update Inventory
    container.quantity = convertFromBase(availableQtyBase - requestedQtyBase, container.unit);
    if (container.quantity < 0.001) {
      container.status = 'Empty';
    } else {
      container.status = 'In Use';
    }

    // Update Global Chemical Stock
    const chemTotalBase = chemical.base_quantity || convertToBase(chemical.quantity, chemical.unit);
    chemical.base_quantity = Math.max(0, chemTotalBase - requestedQtyBase);
    chemical.quantity = convertFromBase(chemical.base_quantity, chemical.unit);

    await Promise.all([
      transaction.save(),
      container.save(),
      chemical.save()
    ]);

    // 4. Audit & Notifications
    await AuditLog.create({
      user: { id: req.user.id, name: req.user.name, role: req.user.role },
      action: 'UPDATE',
      target: { type: 'transaction', id: transaction._id, name: `Check-Out: ${chemical.name}` },
      details: `Checked out ${quantity} ${unit} from container ${container.container_id}`,
      metadata: { ip: req.ip, userAgent: req.headers['user-agent'] }
    });

    res.status(201).json({
      message: 'Check-out successful',
      transaction,
      remaining_stock: container.quantity + ' ' + container.unit
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Rapid Check-In
 */
exports.checkIn = async (req, res) => {
  try {
    const { 
      container_id, 
      returned_quantity, 
      unit, 
      notes,
      safety_verified,
      is_contaminated
    } = req.body;

    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const container = await Container.findOne({ ...labQuery, _id: container_id });
    if (!container) return res.status(404).json({ error: 'Container not found' });
    
    // Explicitly fetch chemical document safely
    const chemId = container.chemical_id;
    const chemQuery = mongoose.Types.ObjectId.isValid(chemId) ? { $or: [{ _id: chemId }, { id: chemId }] } : { id: chemId };
    const chemical = await Chemical.findOne({ ...labQuery, ...chemQuery });
    if (!chemical) return res.status(404).json({ error: 'Associated chemical record missing.' });

    // Find the most recent active checkout for this user and container
    const originalTransaction = await Transaction.findOne({
      ...labQuery,
      container_id: container._id,
      user_id: req.user.id,
      type: 'Check-Out',
      status: 'Active'
    }).sort({ createdAt: -1 });

    // 1. Validation & Safety
    if (is_contaminated) {
      await Notification.create({
        lab: req.activeLabId,
        type: 'SYSTEM',
        category: 'safety',
        title: 'Contaminated Return Alert',
        message: `User ${req.user.name} reported contamination for ${chemical.name} (Container: ${container.container_id}).`,
        severity: 'high',
        recipients: [{ role: 'admin' }, { role: 'safety_officer' }]
      });
    }

    // 2. Create Transaction
    const transaction = new Transaction({
      type: 'Check-In',
      chemical_id: chemical._id,
      chemical_name: chemical.name,
      container_id: container._id,
      container_barcode: container.container_id,
      user_id: req.user.id,
      user_name: req.user.name,
      quantity: returned_quantity,
      unit,
      original_checkout_id: originalTransaction ? originalTransaction._id : null,
      status: 'Completed',
      notes: notes + (is_contaminated ? ' [CONTAMINATED]' : ''),
      safety_verification: safety_verified
    });

    // 3. Update Inventory
    const returnedQtyBase = convertToBase(returned_quantity, unit);
    const currentQtyBase = convertToBase(container.quantity, container.unit);
    
    container.quantity = convertFromBase(currentQtyBase + returnedQtyBase, container.unit);
    container.status = 'In Use'; // Returning something makes it "In Use" again if it was empty

    const chemTotalBase = chemical.base_quantity || convertToBase(chemical.quantity, chemical.unit);
    chemical.base_quantity = chemTotalBase + returnedQtyBase;
    chemical.quantity = convertFromBase(chemical.base_quantity, chemical.unit);

    // If there was an original checkout, mark it completed
    if (originalTransaction) {
      originalTransaction.status = 'Completed';
      await originalTransaction.save();
    }

    await Promise.all([
      transaction.save(),
      container.save(),
      chemical.save()
    ]);

    res.json({
      message: 'Check-in successful',
      transaction,
      new_stock: container.quantity + ' ' + container.unit
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Dashboard / History Analytics
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const { limit = 20, type, user_id } = req.query;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = { ...labQuery };
    if (type) query.type = type;
    if (user_id) query.user_id = user_id;

    const history = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('user_id', 'name email')
      .populate('container_id', 'container_id location');

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

