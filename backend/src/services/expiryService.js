const Chemical = require('../models/Chemical');
const Batch = require('../models/Batch');
const Container = require('../models/Container');
const { notifyExpiry } = require('../services/notificationService');

/**
 * Checks and updates the expiry status of a chemical in real-time.
 * Triggers alerts immediately if the chemical is expired or near expiry.
 * 
 * @param {Object} chemical - The chemical document
 */
const checkChemicalExpiry = async (chemical) => {
  if (!chemical || !chemical.expiry_date) return chemical;

  const now = new Date();
  const exp = new Date(chemical.expiry_date);
  const diffTime = exp - now;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nearExpiryDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
  
  let newStatus = chemical.status;
  
  if (daysRemaining <= 0) {
    newStatus = 'Expired';
  } else if (daysRemaining <= nearExpiryDays && chemical.status !== 'Expired') {
    newStatus = 'Near Expiry';
  } else if (chemical.status === 'Expired' || chemical.status === 'Near Expiry') {
    // If the date was updated to a future date
    newStatus = chemical.quantity <= 0 ? 'Out of Stock' : (chemical.quantity < 5 ? 'Low Stock' : 'In Stock');
  }

  let statusChanged = false;

  // Update chemical if status changed
  if (chemical.status !== newStatus) {
    chemical.status = newStatus;
    await chemical.save();
    statusChanged = true;
  }

  // Also sync and validate containers if status is Expired/Near Expiry or just changed
  if (statusChanged || newStatus === 'Expired' || newStatus === 'Near Expiry') {
     const containers = await Container.find({ chemical_id: chemical.id, status: { $nin: ['Empty', 'Damaged'] } });
     
     for (let container of containers) {
         if (container.expiry_date) {
             const cExp = new Date(container.expiry_date);
             const cDiff = cExp - now;
             const cDaysRemaining = Math.ceil(cDiff / (1000 * 60 * 60 * 24));
             
             let cStatus = container.status;
             if (cDaysRemaining <= 0) {
               cStatus = 'Expired';
             } else if (cDaysRemaining <= nearExpiryDays) {
               cStatus = 'Near Expiry';
             } else if (cStatus === 'Expired' || cStatus === 'Near Expiry') {
               cStatus = container.quantity > 0 ? 'In Use' : 'Empty';
             }
             
             if (container.status !== cStatus) {
                container.status = cStatus;
                await container.save();
             }

             // Send alert only if the container is currently expired or near expiry
             if (cStatus === 'Expired' || cStatus === 'Near Expiry') {
                await notifyExpiry(chemical, container, cDaysRemaining);
             }
         }
     }
  }

  return chemical;
};

module.exports = {
  checkChemicalExpiry
};


