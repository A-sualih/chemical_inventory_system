const express = require('express');
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../authMiddleware');

const router = express.Router();

// Get stats for Dashboard
router.get('/stats', authenticate, async (req, res) => {
  const db = await getDb();
  try {
    const totalCount = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE archived = 0');
    const flammables = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE ghs_classes LIKE "%0%" AND archived = 0'); // Quick hack: index 0 is 🔥
    const lowStock = await db.get('SELECT COUNT(*) as count FROM chemicals WHERE status = "Low Stock" AND archived = 0');
    const stats = {
      total: totalCount.count,
      flammables: flammables.count,
      lowStock: lowStock.count,
      auditScore: "94%"
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all non-archived chemicals
router.get('/', authenticate, async (req, res) => {
  const db = await getDb();
  try {
    const chemicals = await db.all('SELECT * FROM chemicals WHERE archived = 0 ORDER BY created_at DESC');
    res.json(chemicals.map(c => ({...c, ghs_classes: JSON.parse(c.ghs_classes || '[]')})));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new chemical (Manager, Tech, Admin)
router.post('/', authenticate, requireRole(['Admin', 'Lab Manager', 'Lab Technician']), async (req, res) => {
  const db = await getDb();
  const data = req.body;
  
  // Generate a mock ID for now
  const result = await db.get('SELECT COUNT(*) as count FROM chemicals');
  const idValue = `C${String(result.count + 1).padStart(3, '0')}`;
  
  try {
    await db.run(`INSERT INTO chemicals 
      (id, name, iupac_name, cas_number, formula, quantity, unit, state, purity, storage_temp, storage_humidity, supplier, batch_number, expiry_date, ghs_classes, sds_attached, location, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idValue, data.name, data.iupac, data.cas, data.formula, data.quantity, data.unit, data.state, 
        data.purity, data.storageTemp, data.storageHumidity, data.supplier, data.batch, data.expiry,
        JSON.stringify(data.ghs || []), data.sdsAttached ? 1 : 0, data.location || 'Pending Assignment', 'In Stock'
      ]
    );

    const newChem = await db.get('SELECT * FROM chemicals WHERE id = ?', [idValue]);
    res.status(201).json({...newChem, ghs_classes: JSON.parse(newChem.ghs_classes || '[]')});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a chemical
router.put('/:id', authenticate, requireRole(['Admin', 'Lab Manager', 'Lab Technician']), async (req, res) => {
  const db = await getDb();
  const id = req.params.id;
  const data = req.body;

  try {
    await db.run(`UPDATE chemicals SET 
      name = ?, iupac_name = ?, cas_number = ?, formula = ?, quantity = ?, unit = ?, state = ?, purity = ?, 
      storage_temp = ?, storage_humidity = ?, supplier = ?, batch_number = ?, expiry_date = ?, 
      ghs_classes = ?, sds_attached = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        data.name, data.iupac, data.cas, data.formula, data.quantity, data.unit, data.state, 
        data.purity, data.storageTemp, data.storageHumidity, data.supplier, data.batch, data.expiry,
        JSON.stringify(data.ghs || []), data.sdsAttached ? 1 : 0, id
      ]
    );
    res.json({ message: 'Updated successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive (Soft Delete) chemical
router.delete('/:id', authenticate, requireRole(['Admin', 'Lab Manager']), async (req, res) => {
  const db = await getDb();
  try {
    await db.run('UPDATE chemicals SET archived = 1, status = "Archived" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Archived successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
