const Batch = require('../../models/Batch');
const Chemical = require('../../models/Chemical');
const Container = require('../../models/Container');
const { logAudit } = require('../../middleware/authMiddleware');
const { convertToBase, convertFromBase } = require('../../utils/unitConverter');

// Helper to reconcile chemical totals from its batches
const reconcileChemical = async (chemicalId, labId) => {
  const labQuery = labId ? { lab: labId } : {};
  const [chemical, batches] = await Promise.all([
    Chemical.findOne({ id: chemicalId, ...labQuery }),
    Batch.find({ chemical_id: chemicalId, ...labQuery })
  ]);
  
  if (!chemical) return;
  
  let totalInBase = 0;
  for (const b of batches) {
    totalInBase += convertToBase(b.total_quantity, b.unit);
  }
  
  chemical.base_quantity = totalInBase;
  chemical.quantity = convertFromBase(totalInBase, chemical.unit);
  await chemical.save();
};

exports.getBatches = async (req, res) => {
  try {
    const { chemical_id } = req.query;
    const filter = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    if (chemical_id) filter.chemical_id = chemical_id;

    const batches = await Batch.find(filter).lean();
    
    const enrichedBatches = await Promise.all(batches.map(async (batch) => {
      const query = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
      const [chemical, containers] = await Promise.all([
        Chemical.findOne({ id: batch.chemical_id, ...query }),
        Container.find({ batch_number: batch.batch_number, ...query }).select('container_id')
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
};

exports.getBatch = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const batch = await Batch.findOne({ batch_number: req.params.batch_number, ...labQuery }).lean();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    const [chemical, containers] = await Promise.all([
      Chemical.findOne({ id: batch.chemical_id, ...labQuery }),
      Container.find({ batch_number: batch.batch_number, ...labQuery })
    ]);
    
    res.json({
      ...batch,
      chemical_name: chemical ? chemical.name : 'Unknown',
      containers
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createBatch = async (req, res) => {
  const data = req.body;
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const chemical = await Chemical.findOne({ id: data.chemical_id, ...labQuery });
    if (!chemical) return res.status(400).json({ error: 'Chemical reference not found' });

    const newBatch = new Batch({
      ...data,
      created_by: req.user.id,
      last_updated_by: req.user.id,
      lab: req.activeLabId // Enforce lab scope
    });

    await newBatch.save();
    
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'batch',
      targetId: newBatch._id,
      targetName: newBatch.batch_number,
      details: `Added batch ${newBatch.batch_number} for ${chemical.name}`
    });

    // Reconcile chemical total
    await reconcileChemical(data.chemical_id, req.activeLabId);
    
    res.status(201).json(newBatch);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Batch number already exists' });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const batch = await Batch.findOne({ batch_number: req.params.batch_number, ...labQuery });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const updates = req.body;
    Object.assign(batch, updates);
    batch.last_updated_by = req.user.id;
    
    let newExpStatus = null;
    const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
    if (batch.expiry_date) {
        const exp = new Date(batch.expiry_date);
        const now = new Date();
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        if (diff < 0) newExpStatus = 'Expired';
        else if (diff <= thresholdDays) newExpStatus = 'Near Expiry';
        
        if (newExpStatus) batch.status = newExpStatus;
        else if (['Near Expiry', 'Expired'].includes(batch.status)) batch.status = 'Active';
    }

    await batch.save();

    if (updates.expiry_date || newExpStatus) {
        const containers = await Container.find({ batch_number: batch.batch_number, ...labQuery });
        for (let c of containers) {
            if (updates.expiry_date) c.expiry_date = updates.expiry_date;
            
            if (!['Empty', 'Damaged'].includes(c.status)) {
                if (newExpStatus) {
                   c.status = newExpStatus;
                } else if (['Near Expiry', 'Expired'].includes(c.status)) {
                   c.status = 'Full';
                }
            }
            await c.save();
        }
    }
    
    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'batch',
      targetId: batch._id,
      targetName: batch.batch_number,
      details: `Updated batch information for ${batch.batch_number}`
    });

    // Reconcile chemical total
    await reconcileChemical(batch.chemical_id, req.activeLabId);
    
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const batch = await Batch.findOneAndDelete({ batch_number: req.params.batch_number, ...labQuery });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    await logAudit(req, {
      action: 'DELETE',
      targetType: 'batch',
      targetId: batch._id,
      targetName: batch.batch_number,
      details: `Deleted batch ${batch.batch_number}`
    });

    // Reconcile chemical total
    await reconcileChemical(batch.chemical_id, req.activeLabId);
    
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

