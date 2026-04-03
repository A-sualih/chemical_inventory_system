const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../authMiddleware');

const router = express.Router();

// Get inventory transactions
router.get('/logs', authenticate, async (req, res) => {
  const db = await getDb();
  try {
    const logs = await db.all(`
      SELECT l.*, c.name as chemical_name, u.name as user_name 
      FROM inventory_logs l 
      JOIN chemicals c ON l.chemical_id = c.id 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC LIMIT 100
    `);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit a new transaction (Add/Remove stock)
router.post('/transaction', authenticate, requireRole(['Admin', 'Lab Manager', 'Lab Technician']), async (req, res) => {
  const db = await getDb();
  const { chemical_id, action, quantity_change, reason } = req.body;
  const user_id = req.user.id;

  try {
    await db.run('BEGIN TRANSACTION');

    // Make sure chemical exists
    const chem = await db.get('SELECT quantity FROM chemicals WHERE id = ?', [chemical_id]);
    if (!chem) throw new Error("Chemical not found");

    let newQty = chem.quantity;
    if (action === 'IN') {
      newQty += quantity_change;
    } else if (action === 'OUT' || action === 'DISPOSAL') {
      newQty -= quantity_change;
      if (newQty < 0) throw new Error("Insufficient stock");
    }

    // Update chemical quantity
    await db.run('UPDATE chemicals SET quantity = ?, status = ? WHERE id = ?', [
      newQty, 
      newQty < 5 ? 'Low Stock' : 'In Stock',
      chemical_id
    ]);

    // Insert log
    await db.run(`INSERT INTO inventory_logs (chemical_id, user_id, action, quantity_change, reason) VALUES (?, ?, ?, ?, ?)`,
      [chemical_id, user_id, action, quantity_change, reason]
    );

    await db.run('COMMIT');
    res.status(201).json({ message: 'Transaction recorded successfully', newQty });
  } catch (err) {
    await db.run('ROLLBACK');
    res.status(400).json({ error: err.message });
  }
});

// Submit a request (All users)
router.post('/requests', authenticate, async (req, res) => {
  const db = await getDb();
  const { chemical_id, quantity, justification } = req.body;
  
  try {
    await db.run(`INSERT INTO requests (chemical_id, user_id, quantity, justification) VALUES (?, ?, ?, ?)`, 
      [chemical_id, req.user.id, quantity, justification]);
    res.status(201).json({ message: 'Request submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View requests (Admin, Manager)
router.get('/requests', authenticate, requireRole(['Admin', 'Lab Manager']), async (req, res) => {
  const db = await getDb();
  try {
    const requests = await db.all(`
      SELECT r.*, c.name as chemical_name, u.name as user_name 
      FROM requests r 
      JOIN chemicals c ON r.chemical_id = c.id 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update request status (Admin, Manager)
router.put('/requests/:id', authenticate, requireRole(['Admin', 'Lab Manager']), async (req, res) => {
  const db = await getDb();
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    await db.run('UPDATE requests SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Request updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
