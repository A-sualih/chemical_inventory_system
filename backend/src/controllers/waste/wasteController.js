const WasteDisposal = require('../../models/WasteDisposal');
const WasteCompliance = require('../../models/WasteCompliance');
const WasteSafetyIncident = require('../../models/WasteSafetyIncident');
const Chemical = require('../../models/Chemical');
const AuditLog = require('../../models/AuditLog');
const WastePermit = require('../../models/WastePermit');
const Notification = require('../../models/Notification');
const notificationService = require('../../services/notificationService');
const User = require('../../models/User');
const WasteSafetyProtocol = require('../../models/WasteSafetyProtocol');
const { getBaseUnit } = require('../../utils/unitConverter');

// Helper for audit logging
const logWasteAction = async (req, action, targetId, details) => {
  try {
    await AuditLog.create({
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      },
      action: action, // Must be one of: CREATE, UPDATE, DELETE, APPROVE, REJECT, DISPOSAL
      target: {
        type: 'request',
        id: String(targetId),
      },
      details,
      metadata: { ip: req.ip, userAgent: req.headers['user-agent'] }
    });
  } catch (err) {
    console.error('Waste Audit Log Error:', err);
  }
};

/**
 * Log a new disposal request
 */
exports.createDisposalRequest = async (req, res) => {
  try {
    const { chemical_id, batch_id, batch_number, quantity, unit, method, reason, notes, hazard_classification } = req.body;
    
    const chemical = await Chemical.findById(chemical_id);
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    // Clean up empty batch_id strings to prevent BSON errors
    const cleanedBatchId = batch_id === "" ? null : batch_id;

    const disposal = new WasteDisposal({
      chemical_id,
      chemical_name: chemical.name,
      batch_id: cleanedBatchId,
      batch_number,
      quantity,
      unit,
      reason,
      method,
      hazard_classification: hazard_classification || chemical.hazard_summary?.hazard_class,
      notes,
      responsible_person: req.user.id,
      responsible_person_name: req.user.name,
      status: 'Pending Approval'
    });

    // 2. Environmental Safety Detection: High-Risk Activities
    const riskLevel = chemical.hazard_summary?.hazard_class === 'Toxic' || chemical.hazard_summary?.hazard_class === 'Explosive' ? 'Extreme' : 
                      chemical.hazard_summary?.hazard_class === 'Flammable' ? 'High' : 'Moderate';
    
    if (riskLevel === 'Extreme' || quantity > 100) {
       await Notification.create({
         type: 'COMPLIANCE',
         category: 'safety',
         title: 'High-Risk Disposal Alert',
         message: `A high-risk disposal activity has been requested for ${chemical.name} (${quantity} ${unit}). Risk Level: ${riskLevel}.`,
         severity: 'critical',
         recipients: [{ role: 'admin' }, { role: 'lab_manager' }]
       });
    }
    
    // 1. Compliance Check: Legal Disposal Limits
    const permit = await WastePermit.findOne({ status: 'Active', 'limits.hazard_class': hazard_classification || chemical.hazard_summary?.hazard_class });
    if (permit) {
      const limit = permit.limits.find(l => l.hazard_class === (hazard_classification || chemical.hazard_summary?.hazard_class));
      if (limit && (limit.current_quantity + Number(quantity)) > limit.max_quantity) {
        // Create an alert but allow request (officer will see warning)
        await Notification.create({
          type: 'COMPLIANCE',
          category: 'safety',
          title: 'Disposal Limit Warning',
          message: `Disposal of ${quantity} ${unit} ${chemical.name} exceeds the ${limit.period} limit of ${limit.max_quantity} ${limit.unit} for permit ${permit.permit_number}.`,
          severity: 'high',
          recipients: [{ role: 'admin' }, { role: 'lab_manager' }]
        });
      }
    }

    // Immediate unit compatibility check
    const disposalBaseUnit = getBaseUnit(unit);
    const chemBaseUnit = chemical.base_unit || getBaseUnit(chemical.unit);
    
    if (chemBaseUnit && disposalBaseUnit !== chemBaseUnit) {
      return res.status(400).json({ 
        error: `Unit mismatch: This chemical is tracked in ${chemical.unit} (Base: ${chemBaseUnit}), but you selected ${unit}. These units are not compatible.` 
      });
    }

    // 3. Strict Quantity Validation (Prevention at source)
    const requestedQtyInBase = convertToBase(quantity, unit);
    const availableQtyInBase = chemical.base_quantity ?? convertToBase(chemical.quantity, chemical.unit);
    
    if (requestedQtyInBase > (availableQtyInBase + 0.0001)) { // Allow tiny floating point margin
      const availableInRequestedUnit = convertFromBase(availableQtyInBase, unit);
      return res.status(400).json({
        error: `Insufficient inventory: Only ${availableInRequestedUnit} ${unit} available in total inventory. Requested: ${quantity} ${unit}.`
      });
    }

    // 4. Batch-specific check if batch is provided
    if (cleanedBatchId) {
      const batch = await Batch.findById(cleanedBatchId);
      if (batch) {
        const batchQtyInBase = convertToBase(batch.total_quantity, batch.unit);
        if (requestedQtyInBase > (batchQtyInBase + 0.0001)) {
          const batchAvailableInRequestedUnit = convertFromBase(batchQtyInBase, unit);
          return res.status(400).json({
            error: `Insufficient batch stock: Selected batch ${batch.batch_number} only has ${batchAvailableInRequestedUnit} ${unit} remaining.`
          });
        }
      }
    }

    disposal.responsible_person_name = req.user.name;
    await disposal.save();

    // --- IMMEDIATE DEPLETION ON REQUEST ---
    if (chemical) {
      const amountToSubtractInBase = convertToBase(quantity, unit);
      chemical.base_quantity = Math.max(0, (chemical.base_quantity || convertToBase(chemical.quantity, chemical.unit)) - amountToSubtractInBase);
      chemical.quantity = convertFromBase(chemical.base_quantity, chemical.unit);
      
      const impactedBatches = [];
      let remainingToSubtract = amountToSubtractInBase;

      if (cleanedBatchId) {
        const targetBatch = await Batch.findById(cleanedBatchId);
        if (targetBatch) {
          const batchQtyInBase = convertToBase(targetBatch.total_quantity, targetBatch.unit);
          const subtract = Math.min(batchQtyInBase, remainingToSubtract);
          targetBatch.total_quantity = convertFromBase(batchQtyInBase - subtract, targetBatch.unit);
          await depleteContainersForBatch(targetBatch, subtract, disposal.container_id);
          
          impactedBatches.push({
            batch_id: targetBatch._id,
            batch_number: targetBatch.batch_number,
            subtract_quantity: convertFromBase(subtract, unit),
            unit: unit
          });

          remainingToSubtract -= subtract;
          await targetBatch.save();
        }
      }

      if (remainingToSubtract > 0) {
        const batches = await Batch.find({ chemical_id: chemical.id, _id: { $ne: cleanedBatchId } }).sort({ expiry_date: 1 });
        for (const batch of batches) {
          if (remainingToSubtract <= 0) break;
          const bQtyInBase = convertToBase(batch.total_quantity, batch.unit);
          if (bQtyInBase <= 0) continue;

          const subtract = Math.min(bQtyInBase, remainingToSubtract);
          batch.total_quantity = convertFromBase(bQtyInBase - subtract, batch.unit);
          await depleteContainersForBatch(batch, subtract, null);
          
          impactedBatches.push({
            batch_id: batch._id,
            batch_number: batch.batch_number,
            subtract_quantity: convertFromBase(subtract, unit),
            unit: unit
          });

          remainingToSubtract -= subtract;
          await batch.save();
        }
      }
      await chemical.save();
      
      // Trigger Alerts based on new levels
      if (chemical.quantity <= 0) {
        await notificationService.createNotification({
          type: 'SYSTEM',
          category: 'inventory',
          title: 'Out of Stock Alert',
          message: `The inventory for ${chemical.name} has been completely depleted (0 ${chemical.unit}). Please restock if necessary.`,
          severity: 'high',
          recipients: [{ role: 'admin' }, { role: 'lab_manager' }]
        });
      } else {
        const lowStockThreshold = chemical.threshold !== undefined ? chemical.threshold : 5;
        if (chemical.quantity <= lowStockThreshold) {
          // Update status to Low Stock if it's currently In Stock
          if (chemical.status === 'In Stock') {
            chemical.status = 'Low Stock';
            await chemical.save();
          }
          await notificationService.notifyLowStock(chemical, lowStockThreshold);
        }
      }
      disposal.fifo_impact = impactedBatches;
      await disposal.save();
      
      await InventoryLog.create({
        chemical_id: chemical.id,
        chemical_name: chemical.name,
        user_id: req.user.id,
        user_name: req.user.name,
        action: 'DISPOSAL_REQUESTED',
        quantity_change: -quantity,
        unit,
        reason: `Disposal Request: ${reason}`
      });
    }
    // --------------------------------------

    await logWasteAction(req, 'CREATE', disposal._id, `Requested disposal of ${quantity} ${unit} ${chemical.name}`);
    res.status(201).json(disposal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const { convertToBase, convertFromBase } = require('../../utils/unitConverter');

const Batch = require('../../models/Batch');
const Container = require('../../models/Container');
const InventoryLog = require('../../models/InventoryLog');

// Helper to deplete containers for a specific batch
const depleteContainersForBatch = async (batch, amountToSubtractInBase, targetedContainerId) => {
  let containerRemaining = amountToSubtractInBase;
  
  // 1. Target specific container if provided
  if (targetedContainerId) {
    const targetContainer = await Container.findOne({ container_id: targetedContainerId, batch_number: batch.batch_number });
    if (targetContainer) {
      const cQtyInBase = convertToBase(targetContainer.quantity, targetContainer.unit);
      const cSubtract = Math.min(cQtyInBase, containerRemaining);
      targetContainer.quantity = convertFromBase(cQtyInBase - cSubtract, targetContainer.unit);
      containerRemaining -= cSubtract;
      targetContainer.status = targetContainer.quantity < 0.001 ? 'Empty' : 'In Use';
      await targetContainer.save();
    }
  }
  
  // 2. Deplete remaining amount from other containers in this batch (FIFO)
  if (containerRemaining > 0) {
    const containers = await Container.find({ 
      batch_number: batch.batch_number, 
      status: { $nin: ['Empty', 'Damaged'] },
      container_id: { $ne: targetedContainerId } 
    }).sort({ created_at: 1 });
    
    for (const c of containers) {
      if (containerRemaining <= 0) break;
      const cQtyInBase = convertToBase(c.quantity, c.unit);
      const cSubtract = Math.min(cQtyInBase, containerRemaining);
      c.quantity = convertFromBase(cQtyInBase - cSubtract, c.unit);
      containerRemaining -= cSubtract;
      c.status = c.quantity < 0.001 ? 'Empty' : 'In Use';
      await c.save();
    }
  }
};

/**
 * Approve disposal and update inventory
 */
exports.approveDisposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;
    
    const disposal = await WasteDisposal.findById(id);
    if (!disposal) return res.status(404).json({ error: 'Disposal record not found' });
    
    if (disposal.status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Only pending requests can be approved.' });
    }

    disposal.status = 'Approved';
    disposal.approved_by = req.user.id;
    disposal.approval_date = new Date();
    disposal.approval_notes = approval_notes;
    
    await disposal.save();
    await logWasteAction(req, 'APPROVE', disposal._id, `Approved disposal request for ${disposal.chemical_name}`);

    res.json(disposal);
  } catch (err) {
    console.error('Disposal Approval Error:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get FIFO Preview for a disposal request
 */
exports.getDisposalFifoPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const disposal = await WasteDisposal.findById(id);
    if (!disposal) return res.status(404).json({ error: 'Disposal record not found' });
    
    const chemical = await Chemical.findById(disposal.chemical_id);
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    if (disposal.fifo_impact && disposal.fifo_impact.length > 0) {
      return res.json({
        disposal_id: disposal.disposal_id,
        chemical_name: chemical.name,
        requested_quantity: disposal.quantity,
        unit: disposal.unit,
        affected_batches: disposal.fifo_impact.map(i => ({
          batch_id: i.batch_id,
          batch_number: i.batch_number,
          current_quantity: 'Reserved',
          unit: i.unit,
          subtract_quantity: i.subtract_quantity,
          remaining_quantity: 'Reserved',
          is_targeted: i.batch_id?.toString() === disposal.batch_id?.toString()
        })),
        insufficient_inventory: false,
        shortfall: 0,
        is_historical: true
      });
    }

    const amountToSubtractInBase = convertToBase(disposal.quantity, disposal.unit);
    let remainingToSubtract = amountToSubtractInBase;
    const preview = [];
    
    // If stock was already depleted on request but fifo_impact is missing (transitional requests),
    // we should still allow approval if the total inventory + this disposal's quantity covers it.
    const currentTotalInBase = chemical.base_quantity || convertToBase(chemical.quantity, chemical.unit);
    const looksLikeAlreadyDepleted = (currentTotalInBase < amountToSubtractInBase - 0.001);
    
    // 1. Specific batch check
    if (disposal.batch_id) {
      const targetBatch = await Batch.findById(disposal.batch_id);
      if (targetBatch) {
        let batchQtyInBase = convertToBase(targetBatch.total_quantity, targetBatch.unit);
        
        // If we suspect it was already depleted, the "Current" stock for preview should include the reserved amount
        if (looksLikeAlreadyDepleted) {
           batchQtyInBase += amountToSubtractInBase; 
        }

        const subtractFromThisBatch = Math.min(batchQtyInBase, remainingToSubtract);
        
        preview.push({
          batch_id: targetBatch._id,
          batch_number: targetBatch.batch_number,
          current_quantity: convertFromBase(batchQtyInBase, targetBatch.unit),
          unit: targetBatch.unit,
          subtract_quantity: convertFromBase(subtractFromThisBatch, targetBatch.unit),
          remaining_quantity: convertFromBase(batchQtyInBase - subtractFromThisBatch, targetBatch.unit),
          is_targeted: true
        });
        
        remainingToSubtract -= subtractFromThisBatch;
      }
    }
    
    // 2. FIFO batches
    if (remainingToSubtract > 0) {
      const batches = await Batch.find({ 
        chemical_id: chemical.id,
        _id: { $ne: disposal.batch_id }
      }).sort({ expiry_date: 1 });
      
      for (const batch of batches) {
        if (remainingToSubtract <= 0) break;
        
        let batchQtyInBase = convertToBase(batch.total_quantity, batch.unit);
        
        // Handle transitional requests where stock was already depleted
        if (looksLikeAlreadyDepleted && batchQtyInBase < 0.001) {
           // We'll assume this batch was the one depleted if it's now empty
           batchQtyInBase = remainingToSubtract; 
        }

        if (batchQtyInBase > 0) {
          const subtractFromThisBatch = Math.min(batchQtyInBase, remainingToSubtract);
          
          preview.push({
            batch_id: batch._id,
            batch_number: batch.batch_number,
            current_quantity: convertFromBase(batchQtyInBase, batch.unit),
            unit: batch.unit,
            subtract_quantity: convertFromBase(subtractFromThisBatch, batch.unit),
            remaining_quantity: convertFromBase(batchQtyInBase - subtractFromThisBatch, batch.unit),
            is_targeted: false,
            expiry_date: batch.expiry_date
          });
          
          remainingToSubtract -= subtractFromThisBatch;
        }
      }
    }
    
    res.json({
      disposal_id: disposal.disposal_id,
      chemical_name: chemical.name,
      requested_quantity: disposal.quantity,
      unit: disposal.unit,
      affected_batches: preview,
      insufficient_inventory: remainingToSubtract > 0.001,
      shortfall: remainingToSubtract > 0 ? convertFromBase(remainingToSubtract, disposal.unit) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Reject disposal request
 */
exports.rejectDisposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_notes } = req.body;
    
    if (!rejection_notes) {
      return res.status(400).json({ error: 'Rejection notes are required.' });
    }

    const disposal = await WasteDisposal.findById(id);
    if (!disposal) return res.status(404).json({ error: 'Disposal record not found' });
    
    if (disposal.status !== 'Pending Approval') {
      return res.status(400).json({ error: 'Only pending requests can be rejected.' });
    }

    disposal.status = 'Rejected';
    disposal.approval_notes = rejection_notes;
    await disposal.save();

    // --- RESTORE INVENTORY ON REJECTION ---
    const chemical = await Chemical.findById(disposal.chemical_id);
    if (chemical) {
      const amountToAddInBase = convertToBase(disposal.quantity, disposal.unit);
      
      // Update Chemical Totals
      chemical.base_quantity = (chemical.base_quantity || convertToBase(chemical.quantity, chemical.unit)) + amountToAddInBase;
      chemical.quantity = convertFromBase(chemical.base_quantity, chemical.unit);
      
      // Update Batch (Restore to specific batch if targeted, or oldest batch)
      const targetBatch = await Batch.findOne({ chemical_id: chemical.id, batch_number: disposal.batch_number }) || 
                          await Batch.findOne({ chemical_id: chemical.id }).sort({ expiry_date: 1 });
      
      if (targetBatch) {
        const currentQtyInBase = convertToBase(targetBatch.total_quantity, targetBatch.unit);
        targetBatch.total_quantity = convertFromBase(currentQtyInBase + amountToAddInBase, targetBatch.unit);
        
        // Restore to a container
        const container = await Container.findOne({ batch_number: targetBatch.batch_number }).sort({ created_at: -1 });
        if (container) {
          const cQtyInBase = convertToBase(container.quantity, container.unit);
          container.quantity = convertFromBase(cQtyInBase + amountToAddInBase, container.unit);
          if (container.status === 'Empty') container.status = 'In Use';
          await container.save();
        }
        await targetBatch.save();
      }
      await chemical.save();
      
      // Log Inventory Restoration
      await InventoryLog.create({
        chemical_id: chemical.id,
        chemical_name: chemical.name,
        user_id: req.user.id,
        user_name: req.user.name,
        action: 'DISPOSAL_REJECTED',
        quantity_change: disposal.quantity,
        unit: disposal.unit,
        reason: `Disposal Rejected: ${rejection_notes}`
      });
    }
    // --------------------------------------

    await logWasteAction(req, 'REJECT', disposal._id, `Rejected disposal request for ${disposal.chemical_name}: ${rejection_notes}`);

    res.json(disposal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Complete disposal with method details
 */
exports.completeDisposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { method_details, environmental_impact, compliance } = req.body;
    
    const disposal = await WasteDisposal.findById(id);
    if (!disposal) return res.status(404).json({ error: 'Disposal record not found' });
    
    disposal.status = 'Disposed';
    disposal.method_details = { ...disposal.method_details, ...method_details, completion_date: new Date() };
    if (environmental_impact) disposal.environmental_impact = environmental_impact;
    if (compliance) disposal.compliance = compliance;
    
    await disposal.save();
    
    // Compliance Check: Missing Manifest or Certificate
    if (!disposal.compliance?.manifest_number || !disposal.compliance?.certificate_url) {
      await Notification.create({
        type: 'COMPLIANCE',
        category: 'safety',
        title: 'Missing Disposal Documentation',
        message: `Disposal #${disposal.disposal_id} was completed without a manifest number or certificate link.`,
        severity: 'medium',
        recipients: [{ role: 'admin' }, { userId: req.user.id }]
      });
    }

    await logWasteAction(req, 'DISPOSAL', disposal._id, `Completed disposal for ${disposal.chemical_name}`);
    
    res.json(disposal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Waste Permits Management
 */
exports.createPermit = async (req, res) => {
  try {
    const permit = new WastePermit(req.body);
    await permit.save();
    res.status(201).json(permit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPermits = async (req, res) => {
  try {
    const permits = await WastePermit.find().sort({ expiry_date: 1 });
    res.json(permits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Digital Signature for Compliance Log
 */
exports.signComplianceLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await WasteCompliance.findById(id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    
    log.digital_signature = {
      user: req.user.id,
      name: req.user.name,
      timestamp: new Date()
    };
    log.status = 'Resolved';
    
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get all disposal records with filters
 */
exports.getDisposals = async (req, res) => {
  try {
    const { status, method, search, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (method) query.method = method;
    if (search) query.chemical_name = { $regex: search, $options: 'i' };
    
    const disposals = await WasteDisposal.find(query)
      .populate('chemical_id', 'name cas_number hazard_summary')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
      
    const total = await WasteDisposal.countDocuments(query);
    
    res.json({ disposals, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Compliance Logging
 */
exports.createComplianceLog = async (req, res) => {
  try {
    const log = new WasteCompliance({
      ...req.body,
      recorded_by: req.user.id
    });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getComplianceLogs = async (req, res) => {
  try {
    const logs = await WasteCompliance.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Safety Incident Logging
 */
exports.createSafetyIncident = async (req, res) => {
  try {
    const incident = new WasteSafetyIncident({
      ...req.body,
      reported_by: req.user.id,
      reported_by_name: req.user.name
    });
    await incident.save();
    res.status(201).json(incident);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getSafetyIncidents = async (req, res) => {
  try {
    const incidents = await WasteSafetyIncident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Waste Analytics
 */
exports.getWasteAnalytics = async (req, res) => {
  try {
    // Total disposed by method
    const methodStats = await WasteDisposal.aggregate([
      { $group: { _id: '$method', count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } }
    ]);
    
    // Status counts
    const statusStats = await WasteDisposal.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Incidents by severity
    const incidentStats = await WasteSafetyIncident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    // Monthly trends
    const monthlyStats = await WasteDisposal.aggregate([
      { $match: { createdAt: { $exists: true, $type: 'date' } } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
          quantity: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({ methodStats, statusStats, incidentStats, monthlyStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Safety Protocols Management
 */
exports.getSafetyProtocols = async (req, res) => {
  try {
    const protocols = await WasteSafetyProtocol.find();
    res.json(protocols);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSafetyProtocol = async (req, res) => {
  try {
    const protocol = new WasteSafetyProtocol(req.body);
    await protocol.save();
    res.status(201).json(protocol);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Environmental Impact Assessment recording
 */
exports.updateIncidentImpact = async (req, res) => {
  try {
    const { id } = req.params;
    const { environmental_impact_details, cleanup_procedure_followed, status } = req.body;
    
    const incident = await WasteSafetyIncident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    
    incident.environmental_impact_details = environmental_impact_details;
    incident.cleanup_procedure_followed = cleanup_procedure_followed;
    if (status) incident.status = status;
    
    await incident.save();
    res.json(incident);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



