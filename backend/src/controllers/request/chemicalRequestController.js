const ChemicalRequest = require('../../models/ChemicalRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const TransferRequest = require('../../models/TransferRequest');
const Notification = require('../../models/Notification');
const Chemical = require('../../models/Chemical');
const User = require('../../models/User');

// technician submits
exports.submitRequest = async (req, res) => {
  try {
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
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    let query = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    
    // If technician, only see own
    if (req.user.role === 'Technician') {
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
    const notification = new Notification({
      user: request.requester,
      title: 'Chemical Request Rejected',
      message: `Your request for ${request.chemical_name} was rejected: ${notes}`,
      type: 'Alert',
      lab: request.lab
    });
    await notification.save();

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
    const notification = new Notification({
      user: request.requester,
      title: 'Purchase Requested',
      message: `A purchase order has been initiated for ${request.chemical_name}.`,
      type: 'Info',
      lab: request.lab
    });
    await notification.save();

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

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const request = await ChemicalRequest.findOne({ _id: id, ...labQuery });
    
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    
    if (request.requester.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'You can only cancel your own requests' });
    }

    request.status = 'Cancelled';
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
