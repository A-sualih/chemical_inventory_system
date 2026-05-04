const express = require('express');
const Container = require('../models/Container');
const Chemical = require('../models/Chemical');
const { authenticate, authorize, logAudit } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const router = express.Router();

// Get all containers
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), async (req, res) => {
  try {
    const { chemical_id } = req.query;
    let query = {};
    if (chemical_id) {
       // Check if the provided ID is a MongoDB ObjectId
       if (require('mongoose').Types.ObjectId.isValid(chemical_id)) {
         // It's likely the _id from the Chemical collection
         const chemical = await Chemical.findById(chemical_id);
         if (chemical) {
           // Use the custom string ID (e.g. 'C001') which Containers use
           query.chemical_id = chemical.id;
         } else {
           // If search by _id fails, maybe it IS a string ID that looks like an ObjectId?
           query.chemical_id = chemical_id;
         }
       } else {
         // It's a regular string ID (e.g. 'C001')
         query.chemical_id = chemical_id;
       }
    }

    const containers = await Container.find(query).lean();


    
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
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'container',
      targetId: newContainer._id,
      targetName: newContainer.container_id,
      details: `Added container ${newContainer.container_id} for ${chemical.name}`
    });

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
    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'container',
      targetId: container._id,
      targetName: container.container_id,
      details: `Updated container ${container.container_id}`
    });

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
    await logAudit(req, {
      action: 'DELETE',
      targetType: 'container',
      targetId: container._id,
      targetName: container.container_id,
      details: `Deleted container ${container.container_id}`
    });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


