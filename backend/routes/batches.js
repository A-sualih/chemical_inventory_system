const express = require('express');
const Batch = require('../models/Batch');
const Chemical = require('../models/Chemical');
const Container = require('../models/Container');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const router = express.Router();

// Get all batches
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const batches = await Batch.find().lean();
    
    // Enrich with chemical names and container count
    const enrichedBatches = await Promise.all(batches.map(async (batch) => {
      const [chemical, containers] = await Promise.all([
        Chemical.findOne({ id: batch.chemical_id }),
        Container.find({ batch_number: batch.batch_number }).select('container_id')
      ]);
      
      return { 
        ...batch, 
        chemical_name: chemical ? chemical.name : 'Unknown',
        container_ids: containers.map(c => c.container_id)
      };
    }));
    
    res.json(enrichedBatches);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single batch
router.get('/:batch_number', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const batch = await Batch.findOne({ batch_number: req.params.batch_number }).lean();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    const [chemical, containers] = await Promise.all([
      Chemical.findOne({ id: batch.chemical_id }),
      Container.find({ batch_number: batch.batch_number })
    ]);
    
    res.json({
      ...batch,
      chemical_name: chemical ? chemical.name : 'Unknown',
      containers
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new batch
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), async (req, res) => {
  const data = req.body;
  try {
    const chemical = await Chemical.findOne({ id: data.chemical_id });
    if (!chemical) return res.status(400).json({ error: 'Chemical reference not found' });

    const newBatch = new Batch({
      ...data,
      created_by: req.user.id,
      last_updated_by: req.user.id
    });

    await newBatch.save();
    
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'batch',
      targetId: newBatch._id,
      targetName: newBatch.batch_number,
      details: `Added batch ${newBatch.batch_number} for ${chemical.name}`
    });
    
    res.status(201).json(newBatch);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Batch number already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update batch
router.put('/:batch_number', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), async (req, res) => {
  try {
    const batch = await Batch.findOne({ batch_number: req.params.batch_number });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const updates = req.body;
    Object.assign(batch, updates);
    batch.last_updated_by = req.user.id;
    
    await batch.save();
    
    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'batch',
      targetId: batch._id,
      targetName: batch.batch_number,
      details: `Updated batch information for ${batch.batch_number}`
    });
    
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete batch
router.delete('/:batch_number', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), async (req, res) => {
  try {
    const batch = await Batch.findOneAndDelete({ batch_number: req.params.batch_number });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    await logAudit(req, {
      action: 'DELETE',
      targetType: 'batch',
      targetId: batch._id,
      targetName: batch.batch_number,
      details: `Deleted batch ${batch.batch_number}`
    });
    
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
