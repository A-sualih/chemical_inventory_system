const Batch = require('../models/Batch');
const Chemical = require('../models/Chemical');

/**
 * Automatically syncs batch Information when a chemical or stock entry is made.
 * @param {Object} data - The data containing batch information.
 */
const syncBatch = async (data) => {
  const batchId = data.batch_number || data.batch;
  if (!batchId) return;

  try {
    const chemId = data.id || data.chemical_id;
    const updateData = {
      chemical_id: chemId,
      unit: data.unit || 'L',
      manufacturing_date: data.manufacturing_date || data.mfgDate,
      expiry_date: data.expiry_date || data.expiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Fallback to 1yr if missing
      supplier_name: data.supplier || data.supplier_name,
      building: data.building,
      room: data.room,
      cabinet: data.cabinet,
      shelf: data.shelf,
      notes: data.notes || data.remarks,
      status: 'Active'
    };

    // Use nullish coalescing to allow 0 quantity
    const qty = data.quantity ?? data.total_quantity;
    if (qty !== undefined) {
      updateData.total_quantity = Number(qty);
    } else {
      updateData.total_quantity = 0; // Default if missing
    }

    // Determine status based on expiry
    if (updateData.expiry_date) {
      const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
      const exp = new Date(updateData.expiry_date);
      const now = new Date();
      const diff = (exp - now) / (1000 * 60 * 60 * 24);
      if (diff < 0) updateData.status = 'Expired';
      else if (diff <= thresholdDays) updateData.status = 'Near Expiry';
    }

    // Clean undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    await Batch.findOneAndUpdate(
      { batch_number: batchId },
      { $set: updateData },
      { upsert: true, new: true }
    );

    // Sync back to Chemical model so main inventory list shows the batch
    if (chemId) {
      await Chemical.findOneAndUpdate(
        { id: chemId },
        { 
          $set: { 
            batch_number: batchId,
            expiry_date: updateData.expiry_date,
            manufacturing_date: updateData.manufacturing_date
          } 
        }
      );
    }
    
    console.log(`[BatchSync] Synced batch ${batchId} to record and chemical ${chemId}.`);
  } catch (err) {
    console.error(`[BatchSync] Failed to sync batch ${batchId}:`, err.message);
  }
};

module.exports = { syncBatch };
