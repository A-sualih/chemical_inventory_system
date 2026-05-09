const WasteDisposal = require('../../models/WasteDisposal');
const WasteCompliance = require('../../models/WasteCompliance');
const WasteSafetyIncident = require('../../models/WasteSafetyIncident');
const Chemical = require('../../models/Chemical');
const AuditLog = require('../../models/AuditLog');

// Helper for audit logging
const logWasteAction = async (req, action, targetId, details) => {
  try {
    await AuditLog.create({
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      },
      action: `WASTE_${action}`,
      target: {
        type: 'waste',
        id: targetId,
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
    const { chemical_id, batch_id, batch_number, quantity, unit, reason, method, hazard_classification, notes } = req.body;
    
    const chemical = await Chemical.findById(chemical_id);
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    // Safety Validation: Check for incompatible chemicals (Basic implementation)
    // In a real app, this would query an incompatibility matrix
    if (chemical.hazard_summary?.health && method === 'Neutralization' && !req.body.method_details?.neutralization?.neutralizing_agent) {
       // return res.status(400).json({ error: 'Neutralizing agent required for hazardous chemical neutralization.' });
    }

    const disposal = new WasteDisposal({
      chemical_id,
      chemical_name: chemical.name,
      batch_id,
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

    // Immediate unit compatibility check
    const disposalBaseUnit = getBaseUnit(unit);
    const chemBaseUnit = chemical.base_unit || getBaseUnit(chemical.unit);
    
    if (chemBaseUnit && disposalBaseUnit !== chemBaseUnit) {
      return res.status(400).json({ 
        error: `Unit mismatch: This chemical is tracked in ${chemical.unit} (Base: ${chemBaseUnit}), but you selected ${unit}. These units are not compatible.` 
      });
    }

    await disposal.save();
    await logWasteAction(req, 'REQUEST_CREATED', disposal._id, `Requested disposal of ${quantity} ${unit} ${chemical.name}`);
    
    res.status(201).json(disposal);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const { convertToBase, convertFromBase, getBaseUnit } = require('../../utils/unitConverter');

const Batch = require('../../models/Batch');
const InventoryLog = require('../../models/InventoryLog');

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

    // Update Inventory
    const chemical = await Chemical.findById(disposal.chemical_id);
    if (chemical) {
      const disposalBaseUnit = getBaseUnit(disposal.unit);
      const chemBaseUnit = chemical.base_unit || getBaseUnit(chemical.unit);
      
      // Safety check: Ensure units are compatible (e.g., both mass or both volume)
      if (chemBaseUnit && disposalBaseUnit !== chemBaseUnit) {
        return res.status(400).json({ 
          error: `Unit mismatch: Chemical is tracked in ${chemical.unit} (${chemBaseUnit}), but disposal was logged in ${disposal.unit} (${disposalBaseUnit}).` 
        });
      }

      const amountToSubtractInBase = convertToBase(disposal.quantity, disposal.unit);
      
      // 1. Update Chemical Totals
      if (chemical.base_quantity === undefined) {
        chemical.base_quantity = convertToBase(chemical.quantity, chemical.unit);
      }
      
      chemical.base_quantity = Math.max(0, chemical.base_quantity - amountToSubtractInBase);
      chemical.quantity = convertFromBase(chemical.base_quantity, chemical.unit);
      
      // 2. Update Batches
      let remainingToSubtract = amountToSubtractInBase;

      if (disposal.batch_id) {
        // Specific batch targeted
        const targetBatch = await Batch.findById(disposal.batch_id);
        if (targetBatch) {
          const batchQtyInBase = convertToBase(targetBatch.total_quantity, targetBatch.unit);
          const subtractFromThisBatch = Math.min(batchQtyInBase, remainingToSubtract);
          const newBatchQtyInBase = batchQtyInBase - subtractFromThisBatch;
          
          targetBatch.total_quantity = convertFromBase(newBatchQtyInBase, targetBatch.unit);
          remainingToSubtract -= subtractFromThisBatch;
          
          if (targetBatch.total_quantity < 0.001) targetBatch.total_quantity = 0;
          await targetBatch.save();
        }
      }

      // If there's still quantity to subtract (or no batch was specified), use FIFO for the rest
      if (remainingToSubtract > 0) {
        const batches = await Batch.find({ 
          chemical_id: chemical.id,
          _id: { $ne: disposal.batch_id } // Don't subtract twice from the same batch
        }).sort({ expiry_date: 1 });

        for (const batch of batches) {
          if (remainingToSubtract <= 0) break;
          
          const batchQtyInBase = convertToBase(batch.total_quantity, batch.unit);
          if (batchQtyInBase > 0) {
            const subtractFromThisBatch = Math.min(batchQtyInBase, remainingToSubtract);
            const newBatchQtyInBase = batchQtyInBase - subtractFromThisBatch;
            
            batch.total_quantity = convertFromBase(newBatchQtyInBase, batch.unit);
            remainingToSubtract -= subtractFromThisBatch;
            
            if (batch.total_quantity < 0.001) batch.total_quantity = 0;
            await batch.save();
          }
        }
      }

      // 3. Create Inventory Log for Audit
      await InventoryLog.create({
        chemical_id: chemical.id,
        chemical_name: chemical.name,
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'DISPOSAL',
        quantity_change: -disposal.quantity,
        unit: disposal.unit,
        batch_number: disposal.batch_number, // Log the specific batch if known
        reason: `Waste Disposal: ${disposal.reason}`,
        disposal_method: disposal.method,
        disposal_approved_by: req.user.name,
        disposal_approved_role: req.user.role,
        compliance_notes: approval_notes
      });

      await chemical.save();
    }

    disposal.status = 'Approved';
    disposal.approved_by = req.user.id;
    disposal.approval_date = new Date();
    disposal.approval_notes = approval_notes;
    
    await disposal.save();
    await logWasteAction(req, 'APPROVED', disposal._id, `Approved disposal of ${disposal.quantity} ${disposal.unit} ${disposal.chemical_name}`);

    res.json(disposal);
  } catch (err) {
    console.error('Disposal Approval Error:', err);
    res.status(400).json({ error: err.message });
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
    disposal.approval_notes = rejection_notes; // Reuse approval_notes field or add rejection_notes
    
    await disposal.save();
    await logWasteAction(req, 'REJECTED', disposal._id, `Rejected disposal for ${disposal.chemical_name}: ${rejection_notes}`);

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
    await logWasteAction(req, 'COMPLETED', disposal._id, `Completed disposal for ${disposal.chemical_name}`);
    
    res.json(disposal);
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
