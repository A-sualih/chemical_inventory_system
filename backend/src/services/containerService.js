const Container = require('../models/Container');

/**
 * Automatically syncs container Information when a chemical or stock entry is made.
 * @param {Object} data - The data containing container information.
 */
const syncContainers = async (data) => {
  const numContainers = Number(data.num_containers || data.numContainers || 1);
  const qtyPerContainer = Number(data.quantity_per_container || data.qtyPerContainer || 0);
  const baseId = data.container_id_series || data.containerId || data.id || 'CONT';
  const chemicalId = data.id || data.chemical_id;

  if (!chemicalId) return;

  try {
    for (let i = 1; i <= numContainers; i++) {
      // If numContainers > 1, append index. Otherwise just use baseId.
      const containerId = numContainers > 1 ? `${baseId}-${i}` : baseId;
      
      const updateData = {
        chemical_id: chemicalId,
        quantity: qtyPerContainer || (data.quantity / numContainers) || 0,
        unit: data.unit || 'L',
        batch_number: data.batch_number || data.batch,
        building: data.building,
        room: data.room,
        cabinet: data.cabinet,
        shelf: data.shelf,
        manufacturing_date: data.manufacturing_date || data.mfgDate,
        expiry_date: data.expiry_date || data.expiry,
        container_type: data.container_type || data.containerType || 'Plastic Bottle',
        status: 'Full'
      };

      // Determine status based on expiry
      if (updateData.expiry_date) {
        const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
        const exp = new Date(updateData.expiry_date);
        const now = new Date();
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        if (diff < 0) updateData.status = 'Expired';
        else if (diff <= thresholdDays) updateData.status = 'Near Expiry';
      }

      // Clean undefined
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      await Container.findOneAndUpdate(
        { container_id: containerId },
        { $set: updateData },
        { upsert: true, new: true }
      );
    }
    
    console.log(`[ContainerSync] Synced ${numContainers} containers for ${chemicalId}.`);
  } catch (err) {
    console.error(`[ContainerSync] Failed to sync containers:`, err.message);
  }
};

const { convertToBase, convertFromBase } = require('../utils/unitConverter');

/**
 * Automatically updates a specific container's status based on usage.
 */
const updateContainerStatus = async (containerId, amountRemoved, reason = "", unit = null) => {
  try {
    const query = require('mongoose').Types.ObjectId.isValid(containerId) 
      ? { _id: containerId } 
      : { container_id: containerId };
      
    const container = await Container.findOne(query);
    if (!container) return;


    // 1. Update Quantity with unit conversion
    const txUnit = unit || container.unit || 'L';
    const amountInBase = convertToBase(Number(amountRemoved), txUnit);
    const currentInBase = convertToBase(container.quantity, container.unit);
    
    if (amountInBase > currentInBase + 0.0001) { // Allowance for precision
      throw new Error(`Container ${containerId} has insufficient quantity (${container.quantity} ${container.unit})`);
    }

    const newBase = Math.max(0, currentInBase - amountInBase);
    container.quantity = convertFromBase(newBase, container.unit);

    // 2. Auto "In Use"
    if (container.status === 'Full' && amountRemoved > 0) {
      container.status = 'In Use';
    }

    // 3. Auto "Empty"
    if (container.quantity <= 0.001) { // Floating point safety
      container.quantity = 0;
      container.status = 'Empty';
    }

    // 4. Auto "Damaged"
    const damageKeywords = ['damage', 'leak', 'spill', 'crack', 'broken'];
    if (damageKeywords.some(kw => reason.toLowerCase().includes(kw))) {
      container.status = 'Damaged';
    }

    await container.save();
    console.log(`[ContainerSync] Auto-updated status for ${containerId} to ${container.status}`);
  } catch (err) {
    console.error(`[ContainerSync] Failed to update container status:`, err.message);
  }
};

module.exports = { syncContainers, updateContainerStatus };


