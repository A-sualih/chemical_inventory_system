const Container = require('../../models/Container');
const Chemical = require('../../models/Chemical');
const { logAudit } = require('../../middleware/authMiddleware');
const mongoose = require('mongoose');

exports.getContainers = async (req, res) => {
  try {
    const { chemical_id } = req.query;
    let query = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };

    // Allow overriding lab if provided (for transfers)
    if (req.query.lab) {
      query.lab = req.query.lab;
    }
    if (chemical_id) {
      if (mongoose.Types.ObjectId.isValid(chemical_id)) {
        const chemical = await Chemical.findById(chemical_id);
        if (chemical) {
          query.chemical_id = chemical.id;
        } else {
          query.chemical_id = chemical_id;
        }
      } else {
        query.chemical_id = chemical_id;
      }
    }

    const containers = await Container.find(query).lean();

    const enrichedContainers = await Promise.all(containers.map(async (container) => {
      const query = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
      const chemical = await Chemical.findOne({ id: container.chemical_id, ...query });
      return {
        ...container,
        chemical_name: chemical ? chemical.name : 'Unknown'
      };
    }));

    res.json(enrichedContainers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getContainersByChemical = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const containers = await Container.find({ chemical_id: req.params.chemical_id, ...labQuery });
    res.json(containers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getContainer = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const container = await Container.findOne({ container_id: req.params.id, ...labQuery });
    if (!container) return res.status(404).json({ error: 'Container not found' });
    res.json(container);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createContainer = async (req, res) => {
  const data = req.body;
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const chemical = await Chemical.findOne({ id: data.chemical_id, ...labQuery });
    if (!chemical) return res.status(400).json({ error: 'Chemical reference not found' });

    const newContainer = new Container({
      ...data,
      created_by: req.user.id,
      last_updated_by: req.user.id,
      lab: req.activeLabId
    });

    await newContainer.save();

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
};

exports.updateContainer = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const container = await Container.findOne({ container_id: req.params.id, ...labQuery });
    if (!container) return res.status(404).json({ error: 'Container not found' });

    const updates = req.body;
    Object.assign(container, updates);
    container.last_updated_by = req.user.id;

    await container.save();

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
};

exports.deleteContainer = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const container = await Container.findOneAndDelete({ container_id: req.params.id, ...labQuery });
    if (!container) return res.status(404).json({ error: 'Container not found' });

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
};

