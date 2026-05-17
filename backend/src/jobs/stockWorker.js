const cron = require('node-cron');
const Chemical = require('../models/Chemical');
const { notifyLowStock } = require('../services/notificationService');

/**
 * Scans all active chemicals and fires LOW_STOCK alerts for those below threshold.
 * Runs once on startup, then every day at 06:00.
 */
const runStockCheck = async () => {
  console.log(`[StockWorker] Starting daily stock check at ${new Date().toISOString()}`);
  let alertCount = 0;

  try {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.findOne();
    const globalLowStockPercent = settings?.alertThresholds?.lowStockPercent || 10;

    const chemicals = await Chemical.find({ archived: false });

    for (const chemical of chemicals) {
      // Calculate dynamic threshold
      // 1. If chemical has a custom threshold explicitly set and it's not the default 5 (assuming they modified it)
      // Actually, if we use global percentage, we do: initial_quantity * (globalLowStockPercent / 100)
      // Default to chemical.threshold (5) if initial_quantity is not available
      let calculatedThreshold = chemical.threshold !== undefined ? chemical.threshold : 5;
      
      if (chemical.initial_quantity && chemical.initial_quantity > 0) {
        calculatedThreshold = chemical.initial_quantity * (globalLowStockPercent / 100);
      } else if (chemical.base_quantity && chemical.quantity === chemical.base_quantity && !chemical.initial_quantity) {
          // fallback if initial_quantity isn't set but base_quantity is
          calculatedThreshold = chemical.quantity * (globalLowStockPercent / 100);
      }

      const threshold = calculatedThreshold;

      if (chemical.quantity <= 0) {
        // Out of stock — treat as low stock with threshold = 0
        await notifyLowStock(chemical, 0, chemical.lab);
        alertCount++;
      } else if (chemical.quantity <= threshold) {
        await notifyLowStock(chemical, threshold, chemical.lab);
        alertCount++;

        // Update status to Low Stock if currently In Stock
        if (chemical.status === 'In Stock') {
          chemical.status = 'Low Stock';
          await chemical.save();
        }
      }
    }

    console.log(`[StockWorker] Completed. Fired ${alertCount} low-stock alert(s).`);
  } catch (err) {
    console.error('[StockWorker] Error during execution:', err);
  }
};

/**
 * Initializes the cron job — runs every day at 06:00.
 */
const initStockSchedule = () => {
  cron.schedule('0 6 * * *', () => {
    runStockCheck();
  });

  console.log('[StockWorker] Daily stock check scheduler initialized (runs at 06:00).');
};

module.exports = { runStockCheck, initStockSchedule };

