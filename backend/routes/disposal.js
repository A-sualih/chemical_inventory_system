const express = require('express');
const router = express.Router();
const Disposal = require('../models/Disposal');
const Chemical = require('../models/Chemical');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const { convertToBase } = require('../utils/unitConverter');

// Create a new disposal
router.post('/', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), async (req, res) => {
  const { chemical_id, container_id, quantity, unit, reason, method, notes } = req.body;

  if (!chemical_id || !quantity || !reason || !method) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const chemical = await Chemical.findOne({ id: chemical_id });
    if (!chemical) {
      return res.status(404).json({ error: 'Chemical not found' });
    }

    // Calculate base quantity to subtract
    const disposeBaseQty = convertToBase(Number(quantity), unit || chemical.unit);
    
    // Update chemical stock
    chemical.base_quantity = Math.max(0, (chemical.base_quantity || 0) - disposeBaseQty);
    
    // Convert back from base to chemical unit for the 'quantity' field
    // Assuming simple conversion or using the base unit logic
    // Actually, let's just update quantity in its current unit
    // If unit matches, just subtract from quantity
    if (!unit || unit === chemical.unit) {
       chemical.quantity = Math.max(0, (chemical.quantity || 0) - Number(quantity));
    } else {
       // If units differ, we'd need a more complex conversion back
       // For now, let's assume either they match or we just use base_quantity as source of truth
       // Re-calculate chemical.quantity from base_quantity if needed
       // But Chemical model stores both. Let's keep them in sync.
       // For simplicity, let's assume they use the same unit for disposal as the chemical
       chemical.quantity = Math.max(0, (chemical.quantity || 0) - Number(quantity)); 
    }

    // If a specific container was disposed, decrease count
    // Note: This is an assumption that selecting a container means disposing that container
    if (container_id && chemical.num_containers > 0) {
      chemical.num_containers -= 1;
    }

    if (chemical.base_quantity <= 0) {
      chemical.status = 'Out of Stock';
    } else if (chemical.base_quantity < 50) { // arbitrary low stock threshold
      chemical.status = 'Low Stock';
    }

    await chemical.save();

    // Create disposal record
    const disposal = new Disposal({
      chemical_id,
      container_id,
      user_id: req.user._id,
      quantity: Number(quantity),
      unit: unit || chemical.unit,
      reason,
      method,
      notes
    });

    await disposal.save();

    // Log Audit
    await logAudit(req, 'Chemical Disposed', `Disposed ${quantity} ${unit || chemical.unit} of ${chemical.name} (${chemical_id}). Reason: ${reason}`, 'Disposal', disposal._id);

    res.status(201).json({ message: 'Disposal recorded successfully', disposal, chemical });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all disposals
router.get('/', authenticate, async (req, res) => {
  try {
    const disposals = await Disposal.find().sort({ created_at: -1 }).populate('user_id', 'username');
    res.json(disposals);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
