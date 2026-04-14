const express = require('express');
const Container = require('../models/Container');
const Chemical = require('../models/Chemical');
const { authenticate, authorize, logAudit } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const router = express.Router();

// Get all containers
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const containers = await Container.find().lean();
    
    // Enrich with chemical names
    const enrichedContainers = await Promise.all(containers.map(async (container) => {
      const chemical = await Chemical.findOne({ id: container.chemical_id });
      return { 
        ...container, 
        chemical_name: chemical ? chemical.name : 'Unknown' 
      };
    }));
    
    res.json(enrichedContainers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get containers for a specific chemical
router.get('/chemical/:chemical_id', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const containers = await Container.find({ chemical_id: req.params.chemical_id });
    res.json(containers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single container
router.get('/:id', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const container = await Container.findOne({ container_id: req.params.id });
    if (!container) return res.status(404).json({ error: 'Container not found' });
    res.json(container);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new container
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), async (req, res) => {
  const data = req.body;
  try {
    // Check if chemical exists
    const chemical = await Chemical.findOne({ id: data.chemical_id });
    if (!chemical) return res.status(400).json({ error: 'Chemical reference not found' });

    const newContainer = new Container({
      ...data,
      created_by: req.user.id,
      last_updated_by: req.user.id
    });

    await newContainer.save();

    // Log Audit
    await logAudit(req, 'Created Container', `Added container ${newContainer.container_id} for ${chemical.name}`, 'Container', newContainer._id);

    res.status(201).json(newContainer);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Container ID already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a container
router.put('/:id', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), async (req, res) => {
  try {
    const container = await Container.findOne({ container_id: req.params.id });
    if (!container) return res.status(404).json({ error: 'Container not found' });

    const updates = req.body;
    Object.assign(container, updates);
    container.last_updated_by = req.user.id;
    
    await container.save();

    // Log Audit
    await logAudit(req, 'Updated Container', `Updated container ${container.container_id}`, 'Container', container._id);

    res.json(container);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a container
router.delete('/:id', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), async (req, res) => {
  try {
    const container = await Container.findOneAndDelete({ container_id: req.params.id });
    if (!container) return res.status(404).json({ error: 'Container not found' });

    // Log Audit
    await logAudit(req, 'Deleted Container', `Deleted container ${container.container_id}`, 'Container', container._id);

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
