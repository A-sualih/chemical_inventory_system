const TransferRequest = require('../../models/TransferRequest');
const Chemical = require('../../models/Chemical');
const Batch = require('../../models/Batch');
const Container = require('../../models/Container');
const InventoryLog = require('../../models/InventoryLog');
const Notification = require('../../models/Notification');
const { logAudit } = require('../../middleware/authMiddleware');
const { convertToBase, convertFromBase } = require('../../utils/unitConverter');
const mongoose = require('mongoose');

// 1. Get all requests related to current lab
exports.getTransfers = async (req, res) => {
  try {
    const activeLab = req.activeLabId;
    const isAdminGlobal = req.user.role === 'Admin' && !activeLab;

    let query = {};
    if (!isAdminGlobal) {
      query = {
        $or: [{ source_lab: activeLab }, { destination_lab: activeLab }]
      };
    }

    const requests = await TransferRequest.find(query)
      .populate('chemical_id', 'name cas_number id')
      .populate('source_lab', 'name')
      .populate('destination_lab', 'name')
      .populate('requested_by', 'name')
      .populate('handled_by', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Submit a request
exports.createTransfer = async (req, res) => {
  try {
    const { chemical_id, source_lab_id, quantity_moved, unit, reason } = req.body;
    
    // destination is always user's active lab
    const request = new TransferRequest({
      chemical_id,
      source_lab: source_lab_id,
      destination_lab: req.activeLabId,
      quantity_moved,
      unit,
      reason,
      requested_by: req.user.id,
    });

    await request.save();

    // Notify source lab managers
    await Notification.create({
      user: null, // Broadcast to lab role
      title: 'New Transfer Request',
      message: `A request for ${quantity_moved} ${unit} of a chemical has been received from another laboratory.`,
      type: 'Info',
      lab: source_lab_id
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 3. Approve and Execute Transfer
exports.approveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const activeLab = req.activeLabId;

    const request = await TransferRequest.findById(id).session(session);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    // Only source lab manager can approve
    if (activeLab && request.source_lab.toString() !== activeLab.toString()) {
      return res.status(403).json({ error: 'Only managers of the source laboratory can approve this transfer.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Request is already processed' });
    }

    // Identify Source Chemical and Batches
    const sourceChemical = await Chemical.findOne({ id: request.chemical_id, lab: request.source_lab }).session(session);
    if (!sourceChemical) throw new Error('Chemical not found in source laboratory');

    const amountInBase = convertToBase(request.quantity_moved, request.unit);
    if (sourceChemical.base_quantity < amountInBase) throw new Error('Insufficient inventory in source laboratory');

    // Find destination chemical or create it
    let destChemical = await Chemical.findOne({ id: request.chemical_id, lab: request.destination_lab }).session(session);
    if (!destChemical) {
      destChemical = new Chemical({
        ...sourceChemical.toObject(),
        _id: new mongoose.Types.ObjectId(),
        lab: request.destination_lab,
        quantity: 0,
        base_quantity: 0,
        status: 'Out of Stock'
      });
      await destChemical.save({ session });
    }

    // --- DEPLETE SOURCE ---
    sourceChemical.base_quantity -= amountInBase;
    sourceChemical.quantity = convertFromBase(sourceChemical.base_quantity, sourceChemical.unit);
    await sourceChemical.save({ session });

    // Deplete Batches and Containers in Source (FIFO)
    let remaining = amountInBase;
    const sourceBatches = await Batch.find({ chemical_id: request.chemical_id, lab: request.source_lab }).sort({ expiry_date: 1 }).session(session);
    
    for (const batch of sourceBatches) {
      if (remaining <= 0) break;
      const bQtyBase = convertToBase(batch.total_quantity, batch.unit);
      const subtract = Math.min(bQtyBase, remaining);
      
      if (subtract > 0) {
        batch.total_quantity = convertFromBase(bQtyBase - subtract, batch.unit);
        await batch.save({ session });
        
        // Containers
        const containers = await Container.find({ batch_number: batch.batch_number, lab: request.source_lab }).session(session);
        let cRem = subtract;
        for (const c of containers) {
           if (cRem <= 0) break;
           const cQtyBase = convertToBase(c.quantity, c.unit);
           const cSub = Math.min(cQtyBase, cRem);
           c.quantity = convertFromBase(cQtyBase - cSub, c.unit);
           if (c.quantity < 0.001) c.status = 'Empty';
           await c.save({ session });
           cRem -= cSub;
        }
        
        // --- ADD TO DESTINATION (Maintain Batch Info) ---
        let destBatch = await Batch.findOne({ chemical_id: request.chemical_id, lab: request.destination_lab, batch_number: batch.batch_number }).session(session);
        if (!destBatch) {
           destBatch = new Batch({
             ...batch.toObject(),
             _id: new mongoose.Types.ObjectId(),
             lab: request.destination_lab,
             total_quantity: 0
           });
           await destBatch.save({ session });
        }
        destBatch.total_quantity = convertFromBase(convertToBase(destBatch.total_quantity, destBatch.unit) + subtract, destBatch.unit);
        await destBatch.save({ session });

        // Add dummy container in destination for the transferred amount
        const destContainer = new Container({
          container_id: `TR-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          chemical_id: request.chemical_id,
          batch_number: batch.batch_number,
          lab: request.destination_lab,
          quantity: convertFromBase(subtract, request.unit),
          unit: request.unit,
          status: 'In Use',
          location: 'Receipt Area'
        });
        await destContainer.save({ session });
      }
      remaining -= subtract;
    }

    // --- ADD TO DESTINATION TOTALS ---
    destChemical.base_quantity += amountInBase;
    destChemical.quantity = convertFromBase(destChemical.base_quantity, destChemical.unit);
    destChemical.status = 'In Stock';
    await destChemical.save({ session });

    // Inventory Logs
    await InventoryLog.create([{
      lab: request.source_lab,
      chemical_id: request.chemical_id,
      chemical_name: sourceChemical.name,
      user_id: req.user.id,
      action: 'OUT',
      quantity_change: -request.quantity_moved,
      unit: request.unit,
      reason: `Transfer to Lab: ${request.destination_lab}`
    }], { session });

    await InventoryLog.create([{
      lab: request.destination_lab,
      chemical_id: request.chemical_id,
      chemical_name: destChemical.name,
      user_id: req.user.id,
      action: 'IN',
      quantity_change: request.quantity_moved,
      unit: request.unit,
      reason: `Transfer from Lab: ${request.source_lab}`
    }], { session });

    // Update Request Status
    request.status = 'Approved';
    request.handled_by = req.user.id;
    request.handled_at = new Date();
    request.notes = notes;
    await request.save({ session });

    await session.commitTransaction();
    res.json({ message: 'Transfer successful', request });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

// 4. Reject
exports.rejectTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const activeLab = req.activeLabId;

    const request = await TransferRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    if (activeLab && request.source_lab.toString() !== activeLab.toString()) {
      return res.status(403).json({ error: 'Only managers of the source laboratory can reject this transfer.' });
    }

    request.status = 'Rejected';
    request.handled_by = req.user.id;
    request.handled_at = new Date();
    request.notes = notes;
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Get Lab Chemicals for Requisition
exports.getLabChemicalsForRequisition = async (req, res) => {
  try {
    const { labId } = req.params;
    const chemicals = await Chemical.find({ lab: labId, quantity: { $gt: 0 } }).select('name id cas_number quantity unit');
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
