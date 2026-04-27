const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Chemical = require('../models/Chemical');
const Container = require('../models/Container');
const InventoryLog = require('../models/InventoryLog');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const { updateContainerStatus } = require('../utils/containerManager');
const { convertToBase, getBaseUnit } = require('../utils/unitConverter');

/**
 * Get the FIFO-correct container for a chemical.
 * Rule: Among non-expired, non-empty containers:
 *   1. Earliest expiry_date first
 *   2. If same expiry, smallest remaining quantity first (finish opened bottles before new ones)
 *   3. If still tied, oldest createdAt first
 * GET /api/requests/fifo-container?chemical_id=<_id or id>
 */
router.get('/fifo-container', authenticate, async (req, res) => {
  try {
    const { chemical_id } = req.query;
    if (!chemical_id) return res.status(400).json({ error: 'chemical_id is required' });

    // Resolve to string chemical id (e.g. 'C001')
    let chemStringId = chemical_id;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(chemical_id)) {
      const chem = await Chemical.findById(chemical_id);
      if (!chem) return res.status(404).json({ error: 'Chemical not found' });
      chemStringId = chem.id;
    }

    // Get all pending requests to subtract committed quantities
    const pendingRequests = await Request.find({ status: 'Pending' }).populate('container_id');

    const containers = await Container.find({
      chemical_id: chemStringId,
      status: { $nin: ['Expired', 'Empty', 'Disposed'] },
      quantity: { $gt: 0 }
    });

    if (!containers.length) {
      return res.status(404).json({ error: 'No available containers for this chemical.' });
    }

    // Subtract pending commitments from each container
    const rates = {
      'kg': 1, 'g': 0.001, 'mg': 0.000001,
      'L': 1, 'l': 1, 'mL': 0.001, 'ml': 0.001, 'ul': 0.000001
    };

    const enriched = containers.map(c => {
      const pending = pendingRequests.filter(pr =>
        pr.container_id && (pr.container_id._id?.toString() === c._id.toString() || pr.container_id === c._id.toString())
      );
      let pendingBase = 0;
      pending.forEach(pr => { pendingBase += Number(pr.quantity) * (rates[pr.unit] || 1); });
      const currentBase = Number(c.quantity) * (rates[c.unit] || 1);
      const availableBase = Math.max(0, currentBase - pendingBase);
      return { container: c, availableBase, availableQty: availableBase / (rates[c.unit] || 1) };
    }).filter(e => e.availableBase > 0.0001);

    if (!enriched.length) {
      return res.status(404).json({ error: 'All containers are fully committed by pending requests.' });
    }

    // FIFO sort: earliest expiry → smallest quantity (finish opened first) → oldest createdAt
    enriched.sort((a, b) => {
      const aExp = a.container.expiry_date ? new Date(a.container.expiry_date).getTime() : Infinity;
      const bExp = b.container.expiry_date ? new Date(b.container.expiry_date).getTime() : Infinity;
      if (Math.abs(aExp - bExp) > 86400000) return aExp - bExp; // different expiry (>1 day)
      // Same expiry: use container with LEAST remaining quantity first (empty opened bottles first)
      if (Math.abs(a.availableBase - b.availableBase) > 0.001) return a.availableBase - b.availableBase;
      // Still tied: oldest creation date first
      return new Date(a.container.createdAt) - new Date(b.container.createdAt);
    });

    const best = enriched[0];
    res.json({
      fifo_container_id: best.container._id,
      container_id: best.container.container_id,
      available_quantity: Number(best.availableQty).toFixed(4),
      unit: best.container.unit,
      expiry_date: best.container.expiry_date,
      location: best.container.location,
      status: best.container.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

    // ── FIFO ENFORCEMENT ──────────────────────────────────────────────────────
    // Rules (same as the FIFO engine):
    //   1. Earliest expiry_date first
    //   2. Same expiry (within 1 day) → smallest remaining quantity first
    //      (finish already-opened/partially-used containers before new ones)
    //   3. Still tied → oldest createdAt first
    // Reject if the user picked a container that is not the FIFO-correct one.
    const rates = {
      'kg': 1, 'g': 0.001, 'mg': 0.000001,
      'L': 1, 'l': 1, 'mL': 0.001, 'ml': 0.001, 'ul': 0.000001
    };

    const allContainers = await Container.find({
      chemical_id: chemical.id,
      status: { $nin: ['Expired', 'Empty', 'Disposed'] },
      quantity: { $gt: 0 }
    });

    const allPendingReqs = await Request.find({ status: 'Pending' });

    const enrichedContainers = allContainers.map(c => {
      const cPending = allPendingReqs.filter(pr =>
        pr.container_id && pr.container_id.toString() === c._id.toString()
      );
      let cPendingBase = 0;
      cPending.forEach(pr => { cPendingBase += Number(pr.quantity) * (rates[pr.unit] || 1); });
      const cCurrentBase = Number(c.quantity) * (rates[c.unit] || 1);
      const cAvailBase = Math.max(0, cCurrentBase - cPendingBase);
      return { container: c, availableBase: cAvailBase };
    }).filter(e => e.availableBase > 0.0001);

    enrichedContainers.sort((a, b) => {
      const aExp = a.container.expiry_date ? new Date(a.container.expiry_date).getTime() : Infinity;
      const bExp = b.container.expiry_date ? new Date(b.container.expiry_date).getTime() : Infinity;
      if (Math.abs(aExp - bExp) > 86400000) return aExp - bExp; // different expiry (>1 day)
      // Same expiry: finish smallest/opened container first
      if (Math.abs(a.availableBase - b.availableBase) > 0.001) return a.availableBase - b.availableBase;
      // Still tied: oldest container first
      return new Date(a.container.createdAt) - new Date(b.container.createdAt);
    });

    if (enrichedContainers.length > 0) {
      const fifoCorrect = enrichedContainers[0];
      if (fifoCorrect.container._id.toString() !== container._id.toString()) {
        const nativeAvail = (fifoCorrect.availableBase / (rates[fifoCorrect.container.unit] || 1)).toFixed(3);
        return res.status(400).json({
          error: `FIFO violation: You must finish container "${fifoCorrect.container.container_id}" first — it still has ${nativeAvail} ${fifoCorrect.container.unit} remaining. Please use that container before opening a fuller one.`,
          fifo_container_id: fifoCorrect.container._id,
          fifo_container_label: fifoCorrect.container.container_id,
          fifo_available_native: nativeAvail,
          fifo_unit: fifoCorrect.container.unit
        });
      }
    }
    // ── END FIFO ENFORCEMENT ──────────────────────────────────────────────────

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
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'request',
      targetId: request._id,
      targetName: chemical.name,
      details: `Requested ${quantity} ${unit} of ${chemical.name} from container ${container.container_id}`,
      newValue: request.toObject()
    });
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

    await logAudit(req, {
      action: 'APPROVE',
      targetType: 'request',
      targetId: request._id,
      targetName: chemical.name,
      details: `Approved request ${request._id} for ${chemical.name}`,
      newValue: { status: 'Approved', handled_by: req.user.name, notes }
    });
    
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

    await logAudit(req, {
      action: 'REJECT',
      targetType: 'request',
      targetId: request._id,
      targetName: 'Request',
      details: `Rejected request ${request._id}`,
      newValue: { status: 'Rejected', handled_by: req.user.name, notes }
    });
    
    res.json({ message: 'Request rejected', request });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

module.exports = router;
