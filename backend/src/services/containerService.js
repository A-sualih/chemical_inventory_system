const Container = require('../models/Container');

/**
 * Automatically syncs container Information when a chemical or stock entry is made.
 * @param {Object} data - The data containing container information.
 */
const syncContainers = async (data) => {
  const numContainers = Number(data.num_containers || data.numContainers || 1);
  const qtyPerContainer = Number(data.quantity_per_container || data.qtyPerContainer || 0);
  const chemicalId = data.id || data.chemical_id;
  const mfgBarcode = data.barcode;

  const baseId = (mfgBarcode && numContainers === 1)
    ? mfgBarcode
    : (data.container_id_series || data.containerId || data.id || 'CONT');

  if (!chemicalId) return;

  try {
    const labFilter = data.lab ? { lab: data.lab } : {};
    const existingContainers = await Container.find({ chemical_id: chemicalId, ...labFilter }).sort({ createdAt: 1 });

    const sharedUpdateData = {
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
      barcode: data.barcode,
      container_type: data.container_type || data.containerType || 'Plastic Bottle',
      lab: data.lab
    };

    // Determine status based on expiry
    if (sharedUpdateData.expiry_date) {
      const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
      const exp = new Date(sharedUpdateData.expiry_date);
      const now = new Date();
      const diff = (exp - now) / (1000 * 60 * 60 * 24);
      if (diff < 0) sharedUpdateData.status = 'Expired';
      else if (diff <= thresholdDays) sharedUpdateData.status = 'Near Expiry';
      else sharedUpdateData.status = 'Full';
    }

    // Clean undefined
    Object.keys(sharedUpdateData).forEach(key => sharedUpdateData[key] === undefined && delete sharedUpdateData[key]);

    if (existingContainers.length > 0) {
      // Update existing containers in place up to numContainers
      const countToUpdate = Math.min(existingContainers.length, numContainers);
      for (let i = 0; i < countToUpdate; i++) {
        const cont = existingContainers[i];
        Object.assign(cont, sharedUpdateData);
        await cont.save();
      }

      // If numContainers is greater than existing count, create extra containers
      if (numContainers > existingContainers.length) {
        for (let i = existingContainers.length + 1; i <= numContainers; i++) {
          const containerId = `${baseId}-${i}`;
          await Container.create({
            ...sharedUpdateData,
            container_id: containerId,
            status: sharedUpdateData.status || 'Full'
          });
        }
      }

      // If numContainers is less than existing count, clean up extra containers
      if (numContainers < existingContainers.length) {
        const extraContainers = existingContainers.slice(numContainers);
        const extraIds = extraContainers.map(c => c._id);
        await Container.deleteMany({ _id: { $in: extraIds } });
      }
    } else {
      // No containers exist yet: create numContainers
      for (let i = 1; i <= numContainers; i++) {
        const containerId = numContainers > 1 ? `${baseId}-${i}` : baseId;
        await Container.create({
          ...sharedUpdateData,
          container_id: containerId,
          status: sharedUpdateData.status || 'Full'
        });
      }
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
const updateContainerStatus = async (containerId, amountRemoved, reason = "", unit = null, labId = null) => {
  try {
    const query = require('mongoose').Types.ObjectId.isValid(containerId) 
      ? { _id: containerId } 
      : { container_id: containerId };
    if (labId) query.lab = labId;
      
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



