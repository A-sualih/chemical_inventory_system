const express = require('express');
const router = express.Router();
const Chemical = require('../models/Chemical');
const Request = require('../models/Request');
const InventoryLog = require('../models/InventoryLog');
const Batch = require('../models/Batch');
const Container = require('../models/Container');
const { syncBatch } = require('../utils/batchManager');
const { syncContainers, updateContainerStatus } = require('../utils/containerManager');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const { convertToBase, getBaseUnit, convertFromBase } = require('../utils/unitConverter');

// Get all chemicals
router.get('/chemicals', authenticate, async (req, res) => {
  try {
    const chemicals = await Chemical.find();
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chemicals' });
  }
});

// Add new chemical
router.post('/chemicals', authenticate, authorize(PERMISSIONS.ADD_CHEMICAL), async (req, res) => {
  try {
    const chemData = req.body;
    const baseUnit = getBaseUnit(chemData.unit);
    const baseQuantity = convertToBase(chemData.quantity, chemData.unit);
    
    // Generate a simple ID like C001
    const count = await Chemical.countDocuments();
    const id = `C${String(count + 1).padStart(3, '0')}`;
    
    const chemical = new Chemical({
      ...chemData,
      id,
      base_unit: baseUnit,
      base_quantity: baseQuantity,
      status: chemData.quantity < 5 ? 'Low Stock' : 'In Stock'
    });
    
    await chemical.save();
    await logAudit(req, 'ADD_CHEMICAL', `Added new chemical: ${chemical.name}`, 'Chemical', chemical._id);
    res.status(201).json(chemical);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update chemical
router.put('/chemicals/:id', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), async (req, res) => {
  try {
    const chemical = await Chemical.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    await logAudit(req, 'UPDATE_CHEMICAL', `Updated chemical details for ${chemical.name}`, 'Chemical', chemical._id);
    res.json(chemical);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Transaction Logic (IN/OUT/TRANSFER/DISPOSAL)
router.post('/transaction', authenticate, async (req, res) => {
  const { 
    chemical_id, action, quantity_change, unit, reason, 
    // Detailed IN fields
    batch, mfgDate, purchaseDate, expiry, numContainers, qtyPerContainer, containerType, containerId,
    building, room, cabinet, shelf, supplier, remarks,
    // Detailed OUT/DISPOSAL fields
    experiment_name, department, disposal_method, disposal_approved_by, disposal_approved_role, compliance_notes,
    // Transfer fields
    to_building, to_room, to_cabinet, to_shelf, num_containers_moved, transfer_approved_by, new_location
  } = req.body;

  const user_id = req.user.id;
  const user_role = req.user.role;
  const user_name = req.user.name;

  try {
    const chem = await Chemical.findOne({ id: chemical_id });
    if (!chem) return res.status(404).json({ error: "Chemical not found" });

    // Use default unit if none provided
    const txUnit = unit || chem.unit;
    const changeInBase = convertToBase(Number(quantity_change || (Number(numContainers) * Number(qtyPerContainer))), txUnit);
    
    // Initialize base fields if missing
    if (chem.base_quantity === undefined) {
      chem.base_quantity = convertToBase(chem.quantity, chem.unit);
      chem.base_unit = getBaseUnit(chem.unit);
    }

    let targetChem = chem;
    let oldLoc = chem.location;

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
          quantity: Number(quantity_change || (Number(numContainers) * Number(qtyPerContainer))),
          unit: txUnit,
          base_quantity: changeInBase,
          base_unit: getBaseUnit(txUnit),
          state: chem.state,
          purity: chem.purity,
          concentration: chem.concentration,
          storage_temp: chem.storage_temp,
          storage_humidity: chem.storage_humidity,
          supplier: supplier || chem.supplier,
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

        if (targetChem.batch_number) {
          await syncBatch({
            ...req.body,
            id: targetChem.id,
            quantity: Number(quantity_change || (Number(numContainers) * Number(qtyPerContainer))),
            unit: txUnit
          });
        }

        // Auto-Sync Containers
        await syncContainers({
          ...req.body,
          id: targetChem.id,
        });
      } else {
        targetChem.base_quantity += changeInBase;
        targetChem.quantity = convertFromBase(targetChem.base_quantity, targetChem.unit);
        
        if (targetChem.batch_number) {
          await syncBatch({
            ...req.body,
            id: targetChem.id,
            quantity: targetChem.quantity,
            unit: targetChem.unit
          });
        }
      }
    } else if (action === 'OUT' || action === 'DISPOSAL') {
      targetChem.base_quantity -= changeInBase;
      if (targetChem.base_quantity < 0) return res.status(400).json({ error: "Insufficient stock" });
      targetChem.quantity = convertFromBase(targetChem.base_quantity, targetChem.unit);

      // Auto-Update Container status for OUT/DISPOSAL
      if (req.body.containerId || req.body.container_id) {
        await updateContainerStatus(
          req.body.containerId || req.body.container_id,
          quantity_change,
          reason,
          txUnit
        );
      }
    } else if (action === 'TRANSFER') {
      if (!to_building && !new_location) return res.status(400).json({ error: "Destination location is required for transfer" });
      
      // Validate transfer quantity
      if (changeInBase > (chem.base_quantity + 0.0001)) {
        return res.status(400).json({ error: `Insufficient stock for transfer. Available: ${chem.quantity} ${chem.unit}` });
      }

      const locSummary = to_building ? `${to_building} / ${to_room}` : new_location;
      targetChem.location = locSummary;
      
      if (to_building) {
        targetChem.building = to_building;
        targetChem.room = to_room;
        targetChem.cabinet = to_cabinet;
        targetChem.shelf = to_shelf;
      }

      if (targetChem.batch_number) {
        await syncBatch({
          ...targetChem.toObject(),
          id: targetChem.id
        });
      }

      // Auto-Sync Containers for transfer
      await syncContainers({
        ...targetChem.toObject(),
        id: targetChem.id
      });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Update Chemical Status based on activity and volume
    if (targetChem.quantity <= 0) {
      targetChem.status = 'Out of Stock';
    } else if (action === 'OUT' || action === 'DISPOSAL') {
      targetChem.status = 'In Use';
    } else if (targetChem.quantity < 5) {
      targetChem.status = 'Low Stock';
    } else if (targetChem.status !== 'In Use') {
      targetChem.status = 'In Stock';
    }
    
    await targetChem.save();

    // Insert log
    const log = new InventoryLog({
      chemical_id: targetChem.id,
      chemical_name: chem.name, // Display WHO & WHAT
      user_id,
      user_name, // Display WHO
      user_role, // Display ROLE
      action,
      quantity_change: quantity_change || (Number(numContainers) * Number(qtyPerContainer)),
      unit: txUnit,
      reason: action === 'IN' ? (remarks || reason) : reason,
      batch_number: batch || chem.batch_number,
      building: building || chem.building,
      room: room || chem.room,
      cabinet: cabinet || chem.cabinet,
      shelf: shelf || chem.shelf,
      experiment_name,
      department,
      disposal_method,
      disposal_approved_by,
      disposal_approved_role,
      compliance_notes,
      to_building,
      to_room,
      to_cabinet,
      to_shelf,
      container_id: containerId,
      num_containers_moved,
      transfer_approved_by,
      old_location: oldLoc,
      new_location: action === 'TRANSFER' ? (to_building ? `${to_building} / ${to_room}` : new_location) : (action === 'IN' ? targetChem.location : undefined)
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

// Get all inventory logs
router.get('/logs', authenticate, async (req, res) => {

  try {
    const logs = await InventoryLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory logs' });
  }
});

module.exports = router;
