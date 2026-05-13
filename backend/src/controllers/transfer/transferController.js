const TransferRequest = require('../../models/TransferRequest');
const Lab = require('../../models/Lab');
const Chemical = require('../../models/Chemical');
const Batch = require('../../models/Batch');
const Container = require('../../models/Container');

exports.createTransfer = async (req, res) => {
  try {
    const { destination_lab, chemical_id, quantity_moved, unit, batch_number, container_id } = req.body;
    
    if (!req.user.active_lab) return res.status(400).json({ message: 'No active lab selected' });

    const source_lab = req.user.active_lab;
    
    const request = new TransferRequest({
      source_lab,
      destination_lab,
      chemical_id,
      quantity_moved,
      unit,
      batch_number,
      container_id,
      requested_by: req.user._id,
      transfer_date: new Date()
    });

    await request.save();
    res.status(201).json({ message: 'Transfer request created successfully', request });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const activeLab = req.user.active_lab;
    const requests = await TransferRequest.find({
      $or: [{ source_lab: activeLab }, { destination_lab: activeLab }]
    }).populate('source_lab destination_lab requested_by chemical_id container_id');
    
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveTransfer = async (req, res) => {
  try {
    const transferId = req.params.id;
    const transfer = await TransferRequest.findById(transferId);
    
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.status !== 'Pending') return res.status(400).json({ message: 'Transfer is not pending' });
    
    const sourceChemical = await Chemical.findOne({ _id: transfer.chemical_id, lab: transfer.source_lab });
    if (!sourceChemical || sourceChemical.quantity < transfer.quantity_moved) {
      return res.status(400).json({ message: 'Insufficient quantity in source lab or chemical not found' });
    }

    // 1. Move Chemical logic
    sourceChemical.quantity -= transfer.quantity_moved;
    await sourceChemical.save();

    let destChemical = await Chemical.findOne({ 
      id: sourceChemical.id, 
      lab: transfer.destination_lab 
    });

    if (destChemical) {
      destChemical.quantity += transfer.quantity_moved;
      await destChemical.save();
    } else {
      const newChemData = sourceChemical.toObject();
      delete newChemData._id;
      newChemData.quantity = transfer.quantity_moved;
      newChemData.lab = transfer.destination_lab;
      destChemical = new Chemical(newChemData);
      await destChemical.save();
    }

    // 2. Move Batch logic
    if (transfer.batch_number) {
      if (Batch) {
        const sourceBatch = await Batch.findOne({ batch_number: transfer.batch_number, lab: transfer.source_lab });
        if (sourceBatch) {
          sourceBatch.total_quantity -= transfer.quantity_moved;
          await sourceBatch.save();
          
          let destBatch = await Batch.findOne({ batch_number: transfer.batch_number, lab: transfer.destination_lab });
          if (destBatch) {
            destBatch.total_quantity += transfer.quantity_moved;
            await destBatch.save();
          } else {
            const newBatchData = sourceBatch.toObject();
            delete newBatchData._id;
            newBatchData.total_quantity = transfer.quantity_moved;
            newBatchData.lab = transfer.destination_lab;
            newBatchData.chemical_id = destChemical._id;
            const newBatch = new Batch(newBatchData);
            await newBatch.save();
          }
        }
      }
    }

    // 3. Move Container logic
    if (transfer.container_id) {
       if (Container) {
         const container = await Container.findOne({ container_id: transfer.container_id, lab: transfer.source_lab });
         if (container) {
           container.lab = transfer.destination_lab;
           container.chemical_id = destChemical.id; // It maps to 'C015' string
           await container.save();
         }
       }
    }

    transfer.status = 'Approved';
    transfer.approved_by = req.user._id;
    await transfer.save();

    res.status(200).json({ message: 'Transfer approved and container strictly moved', transfer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectTransfer = async (req, res) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    
    transfer.status = 'Rejected';
    transfer.rejection_reason = req.body.reason || 'No reason provided';
    transfer.approved_by = req.user._id;
    await transfer.save();
    
    res.status(200).json({ message: 'Transfer rejected successfully', transfer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
