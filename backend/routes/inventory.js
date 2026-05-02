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
const { notifyLowStock } = require('../utils/notificationService');


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
router.post('/chemicals', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), async (req, res) => {
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

    // Sync Batch & Containers
    if (chemical.batch_number) {
      await syncBatch({
        ...chemical.toObject(),
        id: chemical.id
      });
    }
    
    await syncContainers({
      ...chemical.toObject(),
      id: chemical.id
    });

    await logAudit(req, {
      action: 'CREATE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Added new chemical: ${chemical.name}`
    });
    res.status(201).json(chemical);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update chemical
router.put('/chemicals/:id', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), async (req, res) => {
  try {
    const chemical = await Chemical.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    // Sync Batch & Containers
    if (chemical.batch_number) {
      await syncBatch({
        ...chemical.toObject(),
        id: chemical.id
      });
    }

    await syncContainers({
      ...chemical.toObject(),
      id: chemical.id
    });

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Updated chemical details for ${chemical.name}`
    });
    res.json(chemical);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Transaction Logic (IN/OUT/TRANSFER/DISPOSAL)
router.post('/transaction', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), async (req, res) => {
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
    let usedContainersLog = [];

    if (action === 'IN') {
      // Capacity Check
      if (building && room && cabinet && shelf) {
        const Location = require('../models/Location');
        const locationDef = await Location.findOne({ building, room, cabinet, shelf, isActive: true });
        if (locationDef) {
          const currentCount = await Chemical.countDocuments({ building, room, cabinet, shelf, archived: false });
          if (currentCount >= locationDef.capacity) {
            return res.status(400).json({ error: `Storage Capacity Reached: This slot (${building}/${room}/${cabinet}/Shelf-${shelf}) is full.` });
          }
        }
      }

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
      // Safety Check on specific container/batch if provided
      const cId = req.body.containerId || req.body.container_id;
      if (cId) {
        const mongoose = require('mongoose');
        const checkContainer = await Container.findOne({ 
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(cId) ? cId : undefined },
            { container_id: cId }
          ].filter(q => q._id !== undefined || q.container_id !== undefined)
        });
        if (checkContainer && checkContainer.status === 'Expired') {
          return res.status(403).json({ error: "SAFETY ALERT: Usage of expired chemical container is strictly prohibited." });
        }
      } else if (batch || chem.batch_number) {

        const checkBatch = await Batch.findOne({ batch_number: batch || chem.batch_number });
        if (checkBatch && checkBatch.status === 'Expired') {
          return res.status(403).json({ error: "SAFETY ALERT: This chemical batch has expired. Please process for proper disposal instead of usage." });
        }
      }

      // FIFO Auto-Deduction Engine (if no specific container forced)
      if (!req.body.containerId && !req.body.container_id) {
        const validContainers = await Container.find({
          chemical_id: targetChem.id,
          status: { $nin: ['Expired', 'Empty'] },
          quantity: { $gt: 0 }
        }).sort({ expiry_date: 1, createdAt: 1 }); // FIFO constraints

        let remainingBaseNeeded = changeInBase;

        for (let container of validContainers) {
          if (remainingBaseNeeded <= 0.0001) break;

          const containerBaseQty = convertToBase(container.quantity, container.unit);
          let deductBaseAmount = Math.min(containerBaseQty, remainingBaseNeeded);

          // Precision rounding for float bugs
          if (Math.abs(deductBaseAmount - containerBaseQty) < 0.001) deductBaseAmount = containerBaseQty;

          const deductContainerUnit = convertFromBase(deductBaseAmount, container.unit);
          container.quantity -= deductContainerUnit;
          if (container.quantity < 0.0001) {
            container.quantity = 0;
            container.status = 'Empty';
          } else {
            container.status = 'In Use';
          }
          await container.save();

          usedContainersLog.push({
            containerId: container.container_id,
            batchId: container.batch_number,
            deducted: deductContainerUnit,
            unit: container.unit,
            remaining: container.quantity
          });

          // Sync underlying Batch quantities
          if (container.batch_number) {
            const b = await Batch.findOne({ batch_number: container.batch_number });
            if (b) {
              const bDeduct = convertFromBase(deductBaseAmount, b.unit);
              b.total_quantity -= bDeduct;
              if (b.total_quantity < 0) b.total_quantity = 0;
              await b.save();
            }
          }

          remainingBaseNeeded -= deductBaseAmount;
        }

        if (remainingBaseNeeded > 0.001) {
          return res.status(400).json({ error: `FIFO Failed: Insufficient viable stock. Short by ${Number(convertFromBase(remainingBaseNeeded, txUnit)).toFixed(2)} ${txUnit}. Remaining inventory may be expired.` });
        }
      } else {
        // Specific Container Deduction
        await updateContainerStatus(
          req.body.containerId || req.body.container_id,
          quantity_change,
          reason,
          txUnit
        );
      }

      targetChem.base_quantity -= changeInBase;
      if (targetChem.base_quantity < 0) targetChem.base_quantity = 0; // Prevent negatives
      targetChem.quantity = convertFromBase(targetChem.base_quantity, targetChem.unit);

    } else if (action === 'TRANSFER') {
      if (!to_building && !new_location) return res.status(400).json({ error: "Destination location is required for transfer" });
      
      // Capacity Check
      if (to_building && to_room && to_cabinet && to_shelf) {
        const Location = require('../models/Location');
        const locationDef = await Location.findOne({ 
          building: to_building, 
          room: to_room, 
          cabinet: to_cabinet, 
          shelf: to_shelf, 
          isActive: true 
        });
        if (locationDef) {
          const currentCount = await Chemical.countDocuments({ 
            building: to_building, 
            room: to_room, 
            cabinet: to_cabinet, 
            shelf: to_shelf, 
            archived: false 
          });
          if (currentCount >= locationDef.capacity) {
            return res.status(400).json({ error: `Storage Capacity Reached: Destination slot is full.` });
          }
        }
      }
      
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

    // Real-Time Expiry Detection
    const { checkChemicalExpiry } = require('../utils/expiryService');
    await checkChemicalExpiry(targetChem);

    // Trigger Low Stock Notification if applicable
    const lowStockThreshold = targetChem.threshold !== undefined ? targetChem.threshold : 5;
    if (targetChem.quantity <= lowStockThreshold) {
      await notifyLowStock(targetChem, lowStockThreshold);
    }

    if (action === 'TRANSFER' || action === 'DISPOSAL') {
      const highHazards = ['Explosive', 'Flammable', 'Toxic', 'Corrosive', 'Oxidizer'];
      if (targetChem.ghs_classes?.some(h => highHazards.includes(h))) {
        const { notifyHazardWarning } = require('../utils/notificationService');
        await notifyHazardWarning(targetChem, action.toLowerCase() + 'ed', req.user);
      }
    }

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

    // Log to Audit Log (Phase 7)
    const auditAction = `STOCK_${action}`;
    let auditDetails = "";
    if (action === 'IN') {
      auditDetails = `Stocked In ${quantity_change || (numContainers * qtyPerContainer)} ${txUnit} of ${chem.name} (Batch: ${batch || chem.batch_number})`;
    } else if (action === 'OUT') {
      let extra = usedContainersLog.length > 0 ? ` (FIFO auto-deducted from ${usedContainersLog.length} containers)` : '';
      auditDetails = `Stocked Out ${quantity_change} ${txUnit} of ${chem.name} for ${experiment_name || reason}${extra}`;
    } else if (action === 'TRANSFER') {
      auditDetails = `Transferred ${quantity_change || 'stock'} of ${chem.name} from ${oldLoc} to ${targetChem.location}`;
    } else if (action === 'DISPOSAL') {
      let extra = usedContainersLog.length > 0 ? ` (FIFO auto-deducted from ${usedContainersLog.length} containers)` : '';
      auditDetails = `Disposed of ${quantity_change} ${txUnit} of ${chem.name} using ${disposal_method}. Approved by: ${disposal_approved_by}${extra}`;
    }

    // Log to Audit Log
    await logAudit(req, {
      action: action === 'IN' ? 'CREATE' : (action === 'OUT' ? 'TRANSFER' : action),
      targetType: 'stock',
      targetId: targetChem.id,
      targetName: targetChem.name,
      details: auditDetails
    });

    res.status(201).json({ 
      message: 'Transaction recorded successfully', 
      newQty: targetChem.quantity, 
      unit: targetChem.unit,
      location: targetChem.location,
      newRecordCreated: targetChem.id !== chem.id,
      fifoDetails: usedContainersLog.length > 0 ? usedContainersLog : undefined
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

// Get inventory logs for a specific chemical
router.get('/logs/:id', authenticate, async (req, res) => {
  try {
    const logs = await InventoryLog.find({ chemical_id: req.params.id }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory logs for chemical' });
  }
});

// FIFO Auto-Usage Engine Endpoint
router.post('/fifo-usage', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), async (req, res) => {
  const { chemical_id, quantity, unit, reason } = req.body;
  const user_id = req.user.id;
  const user_role = req.user.role;
  const user_name = req.user.name;

  try {
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const chem = await Chemical.findOne({ $or: [{ id: chemical_id }, { _id: chemical_id }] });
    if (!chem) return res.status(404).json({ error: 'Chemical not found' });

    const txUnit = unit || chem.unit;
    const requestedBaseQty = convertToBase(Number(quantity), txUnit);

    // 1. Filter: Non-expired batches, sort by earliest expiryDate, then by createdAt
    const validBatches = await Batch.find({
      chemical_id: chem.id,
      status: { $nin: ['Expired'] },
      total_quantity: { $gt: 0 }
    }).sort({ expiry_date: 1, createdAt: 1 });

    if (!validBatches.length) {
      return res.status(400).json({ error: 'No active batches available for this chemical.' });
    }

    let remainingBaseNeeded = requestedBaseQty;
    let usedBatchesLog = [];
    let usedContainersLog = [];
    let updatedContainers = [];
    let updatedBatches = [];

    // Pre-calculate to ensure sufficient total valid stock
    let totalValidBaseAvailable = 0;
    
    // Process FIFO deduction across batches and containers in memory
    for (let batch of validBatches) {
      if (remainingBaseNeeded <= 0.0001) break;

      // 3. Within each batch: Select containers with available quantity
      const validContainers = await Container.find({
        chemical_id: chem.id,
        batch_number: batch.batch_number,
        status: { $nin: ['Expired', 'Empty'] },
        quantity: { $gt: 0 }
      }).sort({ expiry_date: 1, createdAt: 1 });

      let batchDeductedBase = 0;

      for (let container of validContainers) {
        if (remainingBaseNeeded <= 0.0001) break;

        const containerBaseQty = convertToBase(container.quantity, container.unit);
        let deductBaseAmount = Math.min(containerBaseQty, remainingBaseNeeded);

        // Precision rounding
        if (Math.abs(deductBaseAmount - containerBaseQty) < 0.001) deductBaseAmount = containerBaseQty;

        const deductContainerUnit = convertFromBase(deductBaseAmount, container.unit);
        
        container.quantity -= deductContainerUnit;
        if (container.quantity < 0.0001) {
          container.quantity = 0;
          container.status = 'Empty';
        } else {
          container.status = 'In Use';
        }

        updatedContainers.push(container);

        usedContainersLog.push({
          containerId: container.container_id,
          batchId: batch.batch_number,
          deductedQuantity: deductContainerUnit,
          unit: container.unit,
          remainingQuantity: container.quantity
        });

        batchDeductedBase += deductBaseAmount;
        remainingBaseNeeded -= deductBaseAmount;
      }

      if (batchDeductedBase > 0) {
        const batchDeductUnit = convertFromBase(batchDeductedBase, batch.unit);
        batch.total_quantity -= batchDeductUnit;
        if (batch.total_quantity < 0.0001) {
          batch.total_quantity = 0;
          batch.status = 'Empty'; // Optional status change if needed
        }
        updatedBatches.push(batch);
        
        usedBatchesLog.push({
          batchId: batch.batch_number,
          deductedQuantity: batchDeductUnit,
          unit: batch.unit
        });
      }
    }

    if (remainingBaseNeeded > 0.001) {
      return res.status(400).json({ 
        error: `FIFO Failed: Insufficient viable stock. Short by ${Number(convertFromBase(remainingBaseNeeded, txUnit)).toFixed(2)} ${txUnit}. Remaining inventory may be expired or missing.` 
      });
    }

    // Save all changes (Container -> Batch -> Chemical)
    for (let c of updatedContainers) await c.save();
    for (let b of updatedBatches) await b.save();

    // Deduct from Chemical total
    if (chem.base_quantity === undefined) chem.base_quantity = convertToBase(chem.quantity, chem.unit);
    chem.base_quantity -= requestedBaseQty;
    if (chem.base_quantity < 0) chem.base_quantity = 0;
    chem.quantity = convertFromBase(chem.base_quantity, chem.unit);
    
    if (chem.quantity <= 0) chem.status = 'Out of Stock';
    else chem.status = 'In Use';

    await chem.save();

    // Trigger Low Stock Notification if applicable
    const lowStockThreshold = chem.threshold !== undefined ? chem.threshold : 5;
    if (chem.quantity <= lowStockThreshold) {
      await notifyLowStock(chem, lowStockThreshold);
    }



    // 6. Audit & Logging
    const batchIdsList = [...new Set(usedContainersLog.map(c => c.batchId))].join(', ');
    const containerIdsList = usedContainersLog.map(c => c.containerId).join(', ');

    const log = new InventoryLog({
      chemical_id: chem.id,
      chemical_name: chem.name,
      user_id,
      user_name,
      user_role,
      action: 'FIFO_OUT',
      quantity_change: quantity,
      unit: txUnit,
      reason: reason || 'FIFO automated deduction',
      batch_number: batchIdsList,
      container_id: containerIdsList,
      compliance_notes: `FIFO processed. Batches: [${batchIdsList}] Containers: [${containerIdsList}]`
    });
    await log.save();

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'stock',
      targetId: chem.id,
      targetName: chem.name,
      details: `FIFO Out: ${quantity} ${txUnit} consumed. Batches: [${batchIdsList}], Containers: [${containerIdsList}]`
    });

    // 7. Output
    res.status(200).json({
      message: 'FIFO consumption successful',
      totalDeducted: quantity,
      unit: txUnit,
      remainingChemicalStock: chem.quantity,
      batchesUsed: usedBatchesLog,
      containersUsed: usedContainersLog
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Quick Scan Action (Fast Check-In/Check-Out)
router.post('/quick-scan', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), async (req, res) => {
  const { chemical_id, action } = req.body; // action: 'IN' or 'OUT'
  const user_id = req.user.id;
  const user_name = req.user.name;
  const user_role = req.user.role;

  try {
    const chem = await Chemical.findOne({ id: chemical_id });
    if (!chem) return res.status(404).json({ error: 'Chemical not found' });

    // Use quantity_per_container as default step, or 1 if not defined
    const qtyToChange = chem.quantity_per_container || 1;
    const txUnit = chem.unit;
    const changeInBase = convertToBase(qtyToChange, txUnit);

    if (action === 'OUT') {
      if (chem.base_quantity < changeInBase) {
        return res.status(400).json({ error: `Insufficient stock for quick check-out. Available: ${chem.quantity} ${chem.unit}` });
      }

      // Check for expiry safety if applicable to latest batch
      const latestBatch = await Batch.findOne({ chemical_id: chem.id }).sort({ createdAt: -1 });
      if (latestBatch && latestBatch.status === 'Expired') {
        return res.status(403).json({ error: "SAFETY ALERT: Latest batch is expired. Use manual disposal protocol." });
      }

      // Simple deduction for Quick Scan (not forcing specific container)
      chem.base_quantity -= changeInBase;
      chem.quantity = convertFromBase(chem.base_quantity, chem.unit);
      chem.status = chem.quantity <= 0 ? 'Out of Stock' : (chem.quantity < 5 ? 'Low Stock' : 'In Use');
      
      await chem.save();

      // Log the transaction
      const log = new InventoryLog({
        chemical_id: chem.id,
        chemical_name: chem.name,
        user_id,
        user_name,
        user_role,
        action: 'OUT',
        quantity_change: qtyToChange,
        unit: txUnit,
        reason: 'Quick Scan Check-Out',
        batch_number: chem.batch_number,
        location: chem.location
      });
      await log.save();

      await logAudit(req, {
        action: 'TRANSFER',
        targetType: 'stock',
        targetId: chem.id,
        targetName: chem.name,
        details: `Quick Scan Check-Out: ${qtyToChange} ${txUnit} deducted.`
      });

    } else if (action === 'IN') {
      chem.base_quantity += changeInBase;
      chem.quantity = convertFromBase(chem.base_quantity, chem.unit);
      chem.status = chem.quantity >= 5 ? 'In Stock' : 'Low Stock';
      
      await chem.save();

      // Log the transaction
      const log = new InventoryLog({
        chemical_id: chem.id,
        chemical_name: chem.name,
        user_id,
        user_name,
        user_role,
        action: 'IN',
        quantity_change: qtyToChange,
        unit: txUnit,
        reason: 'Quick Scan Check-In',
        batch_number: chem.batch_number,
        location: chem.location
      });
      await log.save();

      await logAudit(req, {
        action: 'CREATE',
        targetType: 'stock',
        targetId: chem.id,
        targetName: chem.name,
        details: `Quick Scan Check-In: ${qtyToChange} ${txUnit} added.`
      });
    } else {
      return res.status(400).json({ error: 'Invalid quick-scan action' });
    }

    res.json({ 
      message: `Successfully checked ${action === 'IN' ? 'in' : 'out'} ${qtyToChange} ${txUnit}`,
      newQty: chem.quantity,
      unit: chem.unit,
      chemicalName: chem.name
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Quick scan failed' });
  }
});

module.exports = router;

