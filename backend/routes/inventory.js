const express = require('express');
const Chemical = require('../models/Chemical');
const InventoryLog = require('../models/InventoryLog');
const Request = require('../models/Request');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../config/roles');
const { convertToBase, getBaseUnit } = require('../utils/unitConverter');

const router = express.Router();

// Get inventory transactions
router.get('/logs', authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOGS), async (req, res) => {
  try {
    const logs = await InventoryLog.find()
      .populate('user_id', 'name')
      .sort({ timestamp: -1 })
      .limit(100);
    
    const logsWithNames = await Promise.all(logs.map(async log => {
      const chem = await Chemical.findOne({ id: log.chemical_id });
      return {
        ...log.toObject(),
        chemical_name: chem ? chem.name : 'Unknown',
        user_name: log.user_id ? log.user_id.name : 'Unknown'
      };
    }));
    
    res.json(logsWithNames);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get logs for a specific chemical
router.get('/logs/:chemical_id', authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOGS), async (req, res) => {
  try {
    const logs = await InventoryLog.find({ chemical_id: req.params.chemical_id })
      .populate('user_id', 'name')
      .sort({ timestamp: -1 });
    
    const logsWithNames = logs.map(log => ({
      ...log.toObject(),
      user_name: log.user_id ? log.user_id.name : 'Unknown'
    }));
    
    res.json(logsWithNames);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit a new transaction (Add/Remove stock)
router.post('/transaction', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), async (req, res) => {
  const { 
    chemical_id, action, quantity_change, unit, reason, 
    new_location, batch, mfgDate, purchaseDate, expiry,
    numContainers, qtyPerContainer, containerType, containerId,
    building, room, cabinet, shelf, remarks
  } = req.body;
  const user_id = req.user.id;

  try {
    const chem = await Chemical.findOne({ id: chemical_id });
    if (!chem) return res.status(404).json({ error: "Chemical not found" });

    // Use default unit if none provided
    const txUnit = unit || chem.unit;
    const changeInBase = convertToBase(Number(quantity_change || (numContainers * qtyPerContainer)), txUnit);
    
    // Initialize base fields if missing
    if (chem.base_quantity === undefined) {
      chem.base_quantity = convertToBase(chem.quantity, chem.unit);
      chem.base_unit = getBaseUnit(chem.unit);
    }

    let targetChem = chem;

    if (action === 'IN') {
      // If adding a NEW batch or to a DIFFERENT location, create a new record for traceability
      const isNewBatch = batch && (batch !== chem.batch_number);
      const isNewLocation = building && (building !== chem.building || room !== chem.room || cabinet !== chem.cabinet || shelf !== chem.shelf);

      if (isNewBatch || isNewLocation) {
        // Generate a new unique ID
        const baseCount = await Chemical.countDocuments({});
        let attempt = baseCount + 1;
        let idValue = '';
        let isUnique = false;
        while (!isUnique) {
          idValue = `C${String(attempt).padStart(3, '0')}`;
          const existing = await Chemical.findOne({ id: idValue });
          if (!existing) isUnique = true;
          else attempt++;
        }

        targetChem = new Chemical({
          id: idValue,
          name: chem.name,
          iupac_name: chem.iupac_name,
          cas_number: chem.cas_number,
          formula: chem.formula,
          quantity: Number(quantity_change || (numContainers * qtyPerContainer)),
          unit: txUnit,
          base_quantity: changeInBase,
          base_unit: getBaseUnit(txUnit),
          state: chem.state,
          purity: chem.purity,
          concentration: chem.concentration,
          storage_temp: chem.storage_temp,
          storage_humidity: chem.storage_humidity,
          supplier: req.body.supplier || chem.supplier,
          batch_number: batch || chem.batch_number,
          manufacturing_date: mfgDate,
          purchase_date: purchaseDate,
          expiry_date: expiry || chem.expiry_date,
          num_containers: Number(numContainers) || 1,
          quantity_per_container: Number(qtyPerContainer),
          container_type: containerType,
          container_id_series: containerId,
          building,
          room,
          cabinet,
          shelf,
          remarks,
          location: building ? `${building}-${room || ''}-${cabinet || ''}-${shelf || ''}`.replace(/-+$/, '') : chem.location,
          ghs_classes: chem.ghs_classes,
          sds_attached: chem.sds_attached,
          sds_file_name: chem.sds_file_name,
          sds_file_url: chem.sds_file_url,
          status: 'In Stock'
        });
      } else {
        targetChem.base_quantity += changeInBase;
        const { convertFromBase } = require('../utils/unitConverter');
        targetChem.quantity = convertFromBase(targetChem.base_quantity, targetChem.unit);
      }
    } else if (action === 'OUT' || action === 'DISPOSAL') {
      targetChem.base_quantity -= changeInBase;
      if (targetChem.base_quantity < 0) return res.status(400).json({ error: "Insufficient stock" });
      const { convertFromBase } = require('../utils/unitConverter');
      targetChem.quantity = convertFromBase(targetChem.base_quantity, targetChem.unit);
    } else if (action === 'TRANSFER') {
      if (!new_location) return res.status(400).json({ error: "New location is required for transfer" });
      targetChem.location = new_location;
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    targetChem.status = targetChem.quantity < 5 ? 'Low Stock' : 'In Stock';
    await targetChem.save();

    // Insert log
    const log = new InventoryLog({
      chemical_id: targetChem.id,
      user_id,
      action,
      quantity_change: quantity_change || (numContainers * qtyPerContainer),
      unit: txUnit,
      reason,
      old_location: chem.location,
      new_location: action === 'TRANSFER' ? new_location : (action === 'IN' ? targetChem.location : undefined)
    });
    await log.save();

    res.status(201).json({ 
      message: 'Transaction recorded successfully', 
      newQty: targetChem.quantity, 
      unit: targetChem.unit,
      location: targetChem.location,
      newRecordCreated: targetChem.id !== chem.id
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Submit a request
router.post('/requests', authenticate, authorize(PERMISSIONS.SUBMIT_REQUEST), async (req, res) => {
  const { chemical_id, quantity, justification } = req.body;
  
  try {
    const chem = await Chemical.findOne({ id: chemical_id });
    const newRequest = new Request({
      chemical_id,
      user_id: req.user.id,
      quantity,
      justification
    });
    await newRequest.save();

    // Log Audit
    await logAudit(req, 'Usage Request', `Submitted request for ${quantity} of ${chem ? chem.name : chemical_id}`, 'Request', newRequest._id);

    res.status(201).json({ message: 'Request submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View requests
router.get('/requests', authenticate, async (req, res) => {
  const canApprove = (ROLE_PERMISSIONS[req.user.role] || []).includes(PERMISSIONS.APPROVE_REQUEST);
  
  try {
    let query = {};
    if (!canApprove) {
      query.user_id = req.user.id;
    }
    
    const requests = await Request.find(query)
      .populate('user_id', 'name')
      .sort({ created_at: -1 });
    
    const requestsWithNames = await Promise.all(requests.map(async r => {
      // Try multiple ways to find the chemical
      let chem = await Chemical.findOne({ id: r.chemical_id });
      if (!chem) {
        // Try by MongoDB _id
        try { chem = await Chemical.findById(r.chemical_id); } catch(e) {}
      }
      if (!chem) {
        // Try by name (case-insensitive partial match)
        chem = await Chemical.findOne({ name: new RegExp(r.chemical_id, 'i') });
      }
      return {
        ...r.toObject(),
        chemical_name: chem ? chem.name : r.chemical_id,
        user_name: r.user_id ? r.user_id.name : 'Unknown'
      };
    }));
    
    res.json(requestsWithNames);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update request status (Approve/Reject)
router.put('/requests/:id', authenticate, authorize(PERMISSIONS.APPROVE_REQUEST), async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = status;
    await request.save();

    // Log Audit
    await logAudit(req, `Request ${status}`, `${status} usage request for ${request.chemical_id}`, 'Request', request._id);
    
    res.json({ message: 'Request updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
