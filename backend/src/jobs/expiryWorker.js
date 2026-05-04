const cron = require('node-cron');
const Batch = require('../models/Batch');
const Container = require('../models/Container');
const AuditLog = require('../models/AuditLog');
const Chemical = require('../models/Chemical');
const { notifyExpiry } = require('../services/notificationService');


/**
 * Run a comprehensive check on all batches and containers to update their expiry status.
 * @param {Object} options - Configuration for the check.
 * @param {number} options.nearExpiryDays - Threshold for 'Near Expiry' status (default: 30).
 */
const runExpiryCheck = async (options = { nearExpiryDays: parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30 }) => {
  console.log(`[ExpiryWorker] Starting daily expiry validation at ${new Date().toISOString()}`);
  
  const now = new Date();
  const nearExpiryCutoff = new Date(now.getTime() + options.nearExpiryDays * 24 * 60 * 60 * 1000);
  
  let updatesCount = 0;

  try {
    // 1. Process Batches
    const batches = await Batch.find({ status: { $ne: 'Recalled' } });
    for (const batch of batches) {
      if (!batch.expiry_date) continue;
      
      const exp = new Date(batch.expiry_date);
      let newStatus = 'Active';
      
      if (exp < now) {
        newStatus = 'Expired';
      } else if (exp < nearExpiryCutoff) {
        newStatus = 'Near Expiry';
      }

      if (batch.status !== newStatus) {
        const oldStatus = batch.status;
        const chemical = await Chemical.findOne({ id: batch.chemical_id });
        const chemName = chemical ? chemical.name : 'Unknown Chemical';
        
        batch.status = newStatus;
        await batch.save();
        updatesCount++;

        // Log to Audit
        await AuditLog.create({
          action: 'UPDATE',
          user: { name: 'System Worker', role: 'System' },
          target: { type: 'batch', id: batch.batch_number, name: `Batch ${batch.batch_number}` },
          details: `Automatic Expiry Update: [${chemName}] status changed from ${oldStatus} to ${newStatus}`,
          changes: { oldValue: { status: oldStatus }, newValue: { status: newStatus } },
          metadata: { status: 'success', ip: '127.0.0.1' }
        });
      }
    }

    // 2. Process Containers
    const containers = await Container.find({ status: { $nin: ['Empty', 'Damaged'] } });
    for (const container of containers) {
      if (!container.expiry_date) continue;

      const exp = new Date(container.expiry_date);
      let newStatus = container.status; // Preserve 'Full' or 'In Use' if not expired

      if (exp < now) {
        newStatus = 'Expired';
      } else if (exp < nearExpiryCutoff) {
        newStatus = 'Near Expiry';
      } else if (['Expired', 'Near Expiry'].includes(container.status)) {
        // If it was expired/near but now it's not (e.g. data correction), set back to reasonable default
        newStatus = container.quantity > 0 ? 'In Use' : 'Empty';
      }

      if (container.status !== newStatus) {
        const oldStatus = container.status;
        const chemical = await Chemical.findOne({ id: container.chemical_id });
        const chemName = chemical ? chemical.name : 'Unknown Chemical';

        container.status = newStatus;
        await container.save();
        updatesCount++;

        // Trigger Notification
        if (chemical && (newStatus === 'Expired' || newStatus === 'Near Expiry')) {
          const daysRemaining = Math.ceil((new Date(container.expiry_date) - now) / (1000 * 60 * 60 * 24));
          await notifyExpiry(chemical, container, daysRemaining);
        }

        // Log to Audit

        await AuditLog.create({
          action: 'UPDATE',
          user: { name: 'System Worker', role: 'System' },
          target: { type: 'container', id: container.container_id, name: `Container ${container.container_id}` },
          details: `Automatic Expiry Update: [${chemName}] status changed from ${oldStatus} to ${newStatus}`,
          changes: { oldValue: { status: oldStatus }, newValue: { status: newStatus } },
          metadata: { status: 'success', ip: '127.0.0.1' }
        });
      }
    }

    // 3. Process Chemicals (to sync parent status for reports)
    const chemicals = await Chemical.find({ archived: false });
    for (const chemical of chemicals) {
      if (!chemical.expiry_date) continue;
      
      const exp = new Date(chemical.expiry_date);
      let newStatus = chemical.status;

      if (exp < now) {
        newStatus = 'Expired';
      } else if (exp < nearExpiryCutoff && chemical.status !== 'Expired') {
        newStatus = 'Near Expiry';
      } else if (['Expired', 'Near Expiry'].includes(chemical.status)) {
        // If it was expired/near but now it's not (data correction), check volume
        newStatus = chemical.quantity <= 0 ? 'Out of Stock' : (chemical.quantity < 5 ? 'Low Stock' : 'In Stock');
      }

      if (chemical.status !== newStatus) {
        const oldStatus = chemical.status;
        chemical.status = newStatus;
        await chemical.save();
        updatesCount++;

        await AuditLog.create({
          action: 'UPDATE',
          user: { name: 'System Worker', role: 'System' },
          target: { type: 'chemical', id: chemical.id, name: chemical.name },
          details: `Automatic Expiry Update: Chemical status changed from ${oldStatus} to ${newStatus}`,
          changes: { oldValue: { status: oldStatus }, newValue: { status: newStatus } },
          metadata: { status: 'success', ip: '127.0.0.1' }
        });
      }
    }

    console.log(`[ExpiryWorker] Completed. Processed ${updatesCount} status modifications.`);
  } catch (err) {
    console.error(`[ExpiryWorker] Error during execution:`, err);
  }
};

/**
 * Initializes the cron job to run daily at midnight.
 */
const initExpirySchedule = () => {
  // Run every day at 00:00 (Midnight)
  cron.schedule('0 0 * * *', () => {
    runExpiryCheck();
  });
  
  console.log('[ExpiryWorker] Daily expiry scheduler initialized.');
};

module.exports = { runExpiryCheck, initExpirySchedule };


