const TransferRequest = require('../../models/TransferRequest');
const Lab = require('../../models/Lab');
const Chemical = require('../../models/Chemical');
const Batch = require('../../models/Batch');
const Container = require('../../models/Container');
const InventoryLog = require('../../models/InventoryLog');
const { convertToBase, convertFromBase, getBaseUnit } = require('../../utils/unitConverter');
const mongoose = require('mongoose');

exports.createTransfer = async (req, res) => {
  try {
    const { destination_lab, chemical_id, quantity_moved, unit, batch_number, container_id } = req.body;
    
    if (!req.activeLabId) return res.status(400).json({ message: 'No active lab selected' });
    if (String(req.activeLabId) === String(destination_lab)) {
      return res.status(400).json({ message: 'Source and destination labs must be different' });
    }

    const source_lab = req.activeLabId;
    
    const request = new TransferRequest({
      source_lab,
      destination_lab,
      chemical_id,
      quantity_moved,
      unit,
      batch_number,
      container_id,
      requested_by: req.user.id,
      transfer_date: new Date(),
      status: 'Pending'
    });

    await request.save();
    res.status(201).json({ message: 'Transfer request created successfully', request });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const activeLab = req.activeLabId;
    if (!activeLab) return res.status(400).json({ message: 'No active lab selected' });

    const requests = await TransferRequest.find({
      $or: [{ source_lab: activeLab }, { destination_lab: activeLab }]
    })
    .populate('source_lab', 'name')
    .populate('destination_lab', 'name')
    .populate('requested_by', 'name email')
    .sort({ createdAt: -1 });
    
    // Manual chemical population if needed, but standard chemical_id ref is usually enough
    // We'll return them as is
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transferId = req.params.id;
    const transfer = await TransferRequest.findById(transferId).session(session);
    
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== 'Pending') throw new Error('Transfer is no longer pending');
    
    // Only destination lab users (receivers) or global admins should approve
    if (String(transfer.destination_lab) !== String(req.activeLabId) && req.user.role !== 'Admin') {
      throw new Error('Only the destination laboratory can approve this transfer');
    }

    const sourceChemical = await Chemical.findOne({ _id: transfer.chemical_id, lab: transfer.source_lab }).session(session);
    if (!sourceChemical) throw new Error('Source chemical record not found');

    const amountInBase = convertToBase(transfer.quantity_moved, transfer.unit);
    const sourceBaseQty = sourceChemical.base_quantity ?? convertToBase(sourceChemical.quantity, sourceChemical.unit);

    if (sourceBaseQty < amountInBase) {
      throw new Error('Insufficient quantity in source lab for this transfer');
    }

    // 1. Update Source Chemical
    sourceChemical.base_quantity = sourceBaseQty - amountInBase;
    sourceChemical.quantity = convertFromBase(sourceChemical.base_quantity, sourceChemical.unit);
    if (sourceChemical.quantity <= 0) sourceChemical.status = 'Out of Stock';
    await sourceChemical.save({ session });

    // 2. Update/Create Destination Chemical
    let destChemical = await Chemical.findOne({ 
      id: sourceChemical.id, 
      lab: transfer.destination_lab 
    }).session(session);

    if (destChemical) {
      const destBaseQty = destChemical.base_quantity ?? convertToBase(destChemical.quantity, destChemical.unit);
      destChemical.base_quantity = destBaseQty + amountInBase;
      destChemical.quantity = convertFromBase(destChemical.base_quantity, destChemical.unit);
      destChemical.status = destChemical.quantity > 0 ? 'In Stock' : 'Out of Stock';
      await destChemical.save({ session });
    } else {
      // Full deep copy of chemical metadata to destination lab
      const newChemData = sourceChemical.toObject();
      delete newChemData._id;
      delete newChemData.createdAt;
      delete newChemData.updatedAt;
      
      newChemData.lab = transfer.destination_lab;
      newChemData.base_quantity = amountInBase;
      newChemData.base_unit = sourceChemical.base_unit || getBaseUnit(sourceChemical.unit);
      newChemData.quantity = convertFromBase(amountInBase, sourceChemical.unit);
      newChemData.unit = sourceChemical.unit;
      newChemData.status = 'In Stock';
      
      destChemical = new Chemical(newChemData);
      await destChemical.save({ session });
    }

    // 3. Move Batch logic
    if (transfer.batch_number) {
      const sourceBatch = await Batch.findOne({ batch_number: transfer.batch_number, lab: transfer.source_lab }).session(session);
      if (sourceBatch) {
        const batchAmtInBase = convertToBase(transfer.quantity_moved, transfer.unit);
        const sourceBatchBaseQty = convertToBase(sourceBatch.total_quantity, sourceBatch.unit);
        
        sourceBatch.total_quantity = convertFromBase(sourceBatchBaseQty - batchAmtInBase, sourceBatch.unit);
        if (sourceBatch.total_quantity <= 0) sourceBatch.status = 'Empty';
        await sourceBatch.save({ session });
        
        let destBatch = await Batch.findOne({ batch_number: transfer.batch_number, lab: transfer.destination_lab }).session(session);
        if (destBatch) {
          const destBatchBaseQty = convertToBase(destBatch.total_quantity, destBatch.unit);
          destBatch.total_quantity = convertFromBase(destBatchBaseQty + batchAmtInBase, destBatch.unit);
          destBatch.status = 'In Stock';
          await destBatch.save({ session });
        } else {
          const newBatchData = sourceBatch.toObject();
          delete newBatchData._id;
          newBatchData.lab = transfer.destination_lab;
          newBatchData.chemical_id = destChemical.id; // It links via 'C0XX' string in some models, check Chemical.id
          newBatchData.total_quantity = convertFromBase(batchAmtInBase, sourceBatch.unit);
          newBatchData.status = 'In Stock';
          
          await Batch.create([newBatchData], { session });
        }
      }
    }

    // 4. Move Container logic
    if (transfer.container_id) {
       const container = await Container.findOne({ 
         $or: [{ _id: transfer.container_id }, { container_id: transfer.container_id }],
         lab: transfer.source_lab 
       }).session(session);
       
       if (container) {
         container.lab = transfer.destination_lab;
         container.chemical_id = destChemical.id; // Map to the business ID string
         await container.save({ session });
       }
    }

    // 5. Inventory Logs (Dual Logging)
    // Log for Source Lab
    await InventoryLog.create([{
      lab: transfer.source_lab,
      chemical_id: sourceChemical.id,
      chemical_name: sourceChemical.name,
      user_id: req.user.id,
      user_name: req.user.name,
      action: 'TRANSFER_OUT',
      quantity_change: -transfer.quantity_moved,
      unit: transfer.unit,
      reason: `Transfer to Lab ${transfer.destination_lab}`,
      new_location: 'TRANSFERRED'
    }], { session });

    // Log for Destination Lab
    await InventoryLog.create([{
      lab: transfer.destination_lab,
      chemical_id: destChemical.id,
      chemical_name: destChemical.name,
      user_id: req.user.id,
      user_name: req.user.name,
      action: 'TRANSFER_IN',
      quantity_change: transfer.quantity_moved,
      unit: transfer.unit,
      reason: `Transfer from Lab ${transfer.source_lab}`,
      new_location: destChemical.location
    }], { session });

    transfer.status = 'Approved';
    transfer.approved_by = req.user.id;
    await transfer.save({ session });

    await session.commitTransaction();
    res.status(200).json({ message: 'Transfer approved and chemical moved between laboratories', transfer });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

exports.rejectTransfer = async (req, res) => {
  try {
    const transfer = await TransferRequest.findOne({ _id: req.params.id, destination_lab: req.activeLabId });
    if (!transfer) return res.status(404).json({ message: 'Transfer not found or unauthorized' });
    
    if (transfer.status !== 'Pending') return res.status(400).json({ message: 'Transfer is no longer pending' });

    transfer.status = 'Rejected';
    transfer.rejection_reason = req.body.reason || 'No reason provided';
    transfer.approved_by = req.user.id;
    await transfer.save();
    
    res.status(200).json({ message: 'Transfer rejected successfully', transfer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
