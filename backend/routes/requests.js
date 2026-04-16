const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Chemical = require('../models/Chemical');
const Container = require('../models/Container');
const InventoryLog = require('../models/InventoryLog');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const { updateContainerStatus } = require('../utils/containerManager');
const { convertToBase, getBaseUnit } = require('../utils/unitConverter'); // I should check if this file exists or update inventory.js to share it

// Submit a request (Technician)
router.post('/', authenticate, authorize(PERMISSIONS.SUBMIT_REQUEST), async (req, res) => {
  const { chemical_id, container_id, quantity, unit, reason } = req.body;
  
  try {
    const chemical = await Chemical.findById(chemical_id);
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    const container = await Container.findById(container_id);
    if (!container) return res.status(404).json({ error: 'Container not found' });

    // 1. Fetch other pending requests for this container
    const existingPending = await Request.find({ 
      container_id: container._id, 
      status: 'Pending' 
    });

    let pendingTotalBase = 0;
    existingPending.forEach(pr => {
      pendingTotalBase += convertToBase(Number(pr.quantity), pr.unit);
    });

    const requestedInBase = convertToBase(Number(quantity), unit);
    const availableInBase = convertToBase(Number(container.quantity), container.unit);

    // Validate if (new request + existing pending) > available stock
    if ((requestedInBase + pendingTotalBase) > (availableInBase + 0.000001)) {
      const trulyAvailableBase = Math.max(0, availableInBase - pendingTotalBase);
      const trulyAvailableInUserUnit = (trulyAvailableBase / (require('../utils/unitConverter').CONVERSION_RATES[unit] || 1)).toFixed(2);
      
      return res.status(400).json({ 
        error: `Insufficient amount. After accounting for other pending requests, only ${trulyAvailableInUserUnit} ${unit} is truly available for new requests.` 
      });
    }


    const request = new Request({
      chemical_id,
      container_id,
      user_id: req.user.id,
      quantity,
      unit,
      reason,
      status: 'Pending'
    });

    await request.save();
    await logAudit(req, 'SUBMIT_REQUEST', `Requested ${quantity} ${unit} of ${chemical.name} from container ${container.container_id}`, 'Request', request._id);
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to submit request' });
  }
});

// Get all requests (Admins/Managers see all, Technicians see theirs)
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};
    const userPermissions = require('../config/roles').ROLE_PERMISSIONS[req.user.role] || [];
    
    if (!userPermissions.includes(PERMISSIONS.APPROVE_REQUEST)) {
      query = { user_id: req.user.id };
    }

    const requests = await Request.find(query)
      .populate('chemical_id', 'name id')
      .populate('container_id', 'container_id location')
      .populate('user_id', 'name email')
      .populate('handled_by', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Approve a request
router.patch('/:id/approve', authenticate, authorize(PERMISSIONS.APPROVE_REQUEST), async (req, res) => {
  const { notes } = req.body;
  try {
    const request = await Request.findById(req.params.id)
      .populate('chemical_id')
      .populate('container_id');
    
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ error: 'Request is already processed' });

    // Validate stock
    const chemical = request.chemical_id;
    const container = request.container_id;

    // We need to use the same logic as inventory transaction to reduce stock
    // For simplicity, let's call the container manager
    
    // Check if sufficient in container
    const requestedInBase = convertToBase(Number(request.quantity), request.unit);
    const availableInBase = convertToBase(Number(container.quantity), container.unit);

    if (requestedInBase > availableInBase + 0.000001) {
        return res.status(400).json({ 
           error: `Insufficient stock in the specified container. Requested: ${request.quantity} ${request.unit}. Available: ${container.quantity} ${container.unit}.` 
        });
    }

    // Update status
    request.status = 'Approved';
    request.handled_by = req.user.id;
    request.handled_at = new Date();
    request.notes = notes;
    await request.save();

    // Now perform the stock reduction (Stock Out)
    const { convertFromBase } = require('../utils/unitConverter');
    
    const requestQty = Number(request.quantity);
    if (isNaN(requestQty)) throw new Error('Invalid request quantity structure');

    // Update container
    await updateContainerStatus(
      container._id,
      requestQty,
      `Approved usage: ${request.reason}`,
      request.unit
    );

    // Initialize base fields if missing (fallback for older records)
    if (chemical.base_quantity === undefined || chemical.base_quantity === null) {
      chemical.base_quantity = convertToBase(Number(chemical.quantity || 0), chemical.unit || 'L');
    }

    // Update chemical base quantity (denormalized total)
    const changeInBase = convertToBase(requestQty, request.unit);
    chemical.base_quantity = Number((chemical.base_quantity - changeInBase).toFixed(6));
    chemical.quantity = convertFromBase(chemical.base_quantity, chemical.unit);
    
    // Update status if empty
    if (chemical.quantity <= 0) {
        chemical.quantity = 0;
        chemical.base_quantity = 0;
        chemical.status = 'Out of Stock';
    }
    await chemical.save();


    // Create Inventory Log
    const log = new InventoryLog({
      chemical_id: chemical.id,
      chemical_name: chemical.name,
      user_id: request.user_id,
      user_name: (await (require('../models/User').findById(request.user_id))).name,
      user_role: 'Lab Technician', // Or better, get it from the user object
      action: 'OUT',
      quantity_change: request.quantity,
      unit: request.unit,
      reason: `Approved Request: ${request.reason}`,
      container_id: container.container_id,
      compliance_notes: `Approved by ${req.user.name}. ${notes || ''}`
    });
    await log.save();

    await logAudit(req, 'APPROVE_REQUEST', `Approved request ${request._id} for ${chemical.name}`, 'Request', request._id);
    
    res.json({ message: 'Request approved and stock updated', request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reject a request
router.patch('/:id/reject', authenticate, authorize(PERMISSIONS.APPROVE_REQUEST), async (req, res) => {
  const { notes } = req.body;
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ error: 'Request is already processed' });

    request.status = 'Rejected';
    request.handled_by = req.user.id;
    request.handled_at = new Date();
    request.notes = notes;
    await request.save();

    await logAudit(req, 'REJECT_REQUEST', `Rejected request ${request._id}`, 'Request', request._id);
    
    res.json({ message: 'Request rejected', request });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

module.exports = router;
