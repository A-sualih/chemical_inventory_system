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
    const { chemical_id, quantity, unit, reason, method, hazard_classification, notes } = req.body;
    
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

    await disposal.save();
    await logWasteAction(req, 'REQUEST_CREATED', disposal._id, `Requested disposal of ${quantity} ${unit} ${chemical.name}`);
    
    res.status(201).json(disposal);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

    // Update Inventory
    const chemical = await Chemical.findById(disposal.chemical_id);
    if (chemical) {
      // Basic quantity reduction (Assume units match or handled by service)
      chemical.quantity = Math.max(0, chemical.quantity - disposal.quantity);
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
