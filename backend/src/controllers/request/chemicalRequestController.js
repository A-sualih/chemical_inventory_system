const ChemicalRequest = require('../../models/ChemicalRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const TransferRequest = require('../../models/TransferRequest');
const { createNotification } = require('../../services/notificationService');
const Chemical = require('../../models/Chemical');
const User = require('../../models/User');

// technician submits
exports.submitRequest = async (req, res) => {
  try {
    if (!req.activeLabId) {
      return res.status(400).json({ error: "Please select an active laboratory to submit a request." });
    }

    const { chemical_name, cas_number, quantity, unit, reason } = req.body;
    
    const request = new ChemicalRequest({
      chemical_name,
      cas_number,
      quantity,
      unit,
      reason,
      requester: req.user.id,
      lab: req.activeLabId
    });

    await request.save();
    
    // Notify Lab Manager of new request
    await createNotification({
      type: 'INFO',
      category: 'inventory',
      title: 'New Chemical Request',
      message: `${req.user.name} has submitted a request for ${quantity} ${unit} of ${chemical_name}. Reason: ${reason}`,
      severity: 'high',
      priority: 2,
      lab: req.activeLabId,
      metadata: {
        triggeredByEmail: req.user.email,
        triggeredByName: req.user.name,
        requestId: request._id
      }
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


exports.getRequests = async (req, res) => {
  try {
    let query = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    
    // If technician, only see own
    if (req.user.role === 'Technician' || req.user.role === 'Lab Technician') {
      query.requester = req.user.id;
    }

    const requests = await ChemicalRequest.find(query)
      .populate('requester', 'name')
      .populate('target_lab', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Choice A: Reject
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const request = await ChemicalRequest.findOne({ _id: id, ...labQuery });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = 'Rejected';
    request.action_taken = 'Reject';
    request.manager_notes = notes;
    await request.save();

    // Notify Technician
    await createNotification({
      type: 'REQUEST_UPDATE',
      category: 'system',
      title: 'Chemical Request Rejected',
      message: `Your request for ${request.chemical_name} was rejected: ${notes}`,
      severity: 'medium',
      priority: 3,
      lab: request.lab,
      metadata: {
        triggeredByEmail: req.user.email,
        triggeredByName: req.user.name,
        user: request.requester
      }
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Choice B: Buy
exports.buyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, unit_price } = req.body; // Basic info to create a PO
    
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const request = await ChemicalRequest.findOne({ _id: id, ...labQuery });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Mark as purchase requested
    request.status = 'Purchase Requested';
    request.action_taken = 'Buy';
    await request.save();

    // Create Notification for technician
    await createNotification({
      type: 'REQUEST_UPDATE',
      category: 'system',
      title: 'Purchase Requested',
      message: `A purchase order has been initiated for ${request.chemical_name}.`,
      severity: 'low',
      priority: 3,
      lab: request.lab,
      metadata: {
        triggeredByEmail: req.user.email,
        triggeredByName: req.user.name,
        user: request.requester
      }
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Choice C: Ask Another Lab
exports.transferRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { target_lab_id, chemical_id } = req.body; // manager selects which chemical in another lab to request
    
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const request = await ChemicalRequest.findOne({ _id: id, ...labQuery });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Create a TransferRequest
    const tr = new TransferRequest({
      source_lab: target_lab_id,
      destination_lab: request.lab,
      chemical_id: chemical_id,
      quantity_moved: request.quantity,
      unit: request.unit,
      reason: `Automated transfer for technician request: ${request.reason}`,
      requested_by: req.user.id,
      status: 'Pending'
    });
    await tr.save();

    request.status = 'Transfer Requested';
    request.action_taken = 'Transfer';
    request.transfer_request_id = tr._id;
    request.target_lab = target_lab_id;
    await request.save();

    await createNotification({
      type: 'REQUEST_UPDATE',
      category: 'system',
      title: 'Transfer Requested',
      message: `A chemical transfer has been initiated for ${request.chemical_name}.`,
      severity: 'low',
      priority: 3,
      lab: request.lab,
      metadata: {
        triggeredByEmail: req.user.email,
        triggeredByName: req.user.name,
        user: request.requester
      }
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

