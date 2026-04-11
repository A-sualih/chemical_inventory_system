const express = require('express');
const Chemical = require('../models/Chemical');
const InventoryLog = require('../models/InventoryLog');
const Request = require('../models/Request');
const { authenticate, requireRole, ROLES } = require('../authMiddleware');

const router = express.Router();

// Get inventory transactions
router.get('/logs', authenticate, async (req, res) => {
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

// Submit a new transaction (Add/Remove stock) (Admin, Manager, Tech)
router.post('/transaction', authenticate, requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER, ROLES.LAB_TECHNICIAN]), async (req, res) => {
  const { chemical_id, action, quantity_change, reason } = req.body;
  const user_id = req.user.id;

  try {
    const chem = await Chemical.findOne({ id: chemical_id });
    if (!chem) return res.status(404).json({ error: "Chemical not found" });

    let newQty = chem.quantity;
    if (action === 'IN') {
      newQty += Number(quantity_change);
    } else if (action === 'OUT' || action === 'DISPOSAL') {
      newQty -= Number(quantity_change);
      if (newQty < 0) return res.status(400).json({ error: "Insufficient stock" });
    }

    // Update chemical quantity
    chem.quantity = newQty;
    chem.status = newQty < 5 ? 'Low Stock' : 'In Stock';
    await chem.save();

    // Insert log
    const log = new InventoryLog({
      chemical_id,
      user_id,
      action,
      quantity_change,
      reason
    });
    await log.save();

    res.status(201).json({ message: 'Transaction recorded successfully', newQty });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Submit a request (All users)
router.post('/requests', authenticate, async (req, res) => {
  const { chemical_id, quantity, justification } = req.body;
  
  try {
    const newRequest = new Request({
      chemical_id,
      user_id: req.user.id,
      quantity,
      justification
    });
    await newRequest.save();
    res.status(201).json({ message: 'Request submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View requests (Admin, Manager see all, others see own)
router.get('/requests', authenticate, async (req, res) => {
  const isAdminOrManager = [ROLES.ADMIN, ROLES.LAB_MANAGER].includes(req.user.role);
  
  try {
    let query = {};
    if (!isAdminOrManager) {
      query.user_id = req.user.id;
    }
    
    const requests = await Request.find(query)
      .populate('user_id', 'name')
      .sort({ created_at: -1 });
    
    const requestsWithNames = await Promise.all(requests.map(async r => {
      const chem = await Chemical.findOne({ id: r.chemical_id });
      return {
        ...r.toObject(),
        chemical_name: chem ? chem.name : 'Unknown',
        user_name: r.user_id ? r.user_id.name : 'Unknown'
      };
    }));
    
    res.json(requestsWithNames);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update request status (Admin, Manager)
router.put('/requests/:id', authenticate, requireRole([ROLES.ADMIN, ROLES.LAB_MANAGER]), async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = status;
    await request.save();
    
    res.json({ message: 'Request updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
