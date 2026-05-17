const app = require('./app');
const { initDb } = require('./config/db');
const { initExpirySchedule, runExpiryCheck } = require('./jobs/expiryWorker');
const { initStockSchedule, runStockCheck }   = require('./jobs/stockWorker');
const { initSafetySchedule, runSafetyCheck } = require('./jobs/safetyWorker');

const PORT = process.env.PORT || 5001;

initDb().then(() => {
  console.log('Database initialized successfully.');

  // ── Scheduled Workers ──────────────────────────────────────────────────────
  initExpirySchedule();   // Runs daily at 00:00 — expiry/near-expiry checks
  initStockSchedule();    // Runs daily at 06:00 — low stock checks
  initSafetySchedule();   // Runs daily at 07:00 — missing SDS, incompatibility, env risk

  // ── Immediate startup checks ───────────────────────────────────────────────
  runExpiryCheck();       // Catch any expiry issues since last server restart
  runStockCheck();        // Catch any low-stock issues since last server restart
  runSafetyCheck();       // Catch any safety issues since last server restart

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Workers: ExpiryWorker (00:00) | StockWorker (06:00) | SafetyWorker (07:00)`);
  });
}).catch(err => {
  console.error('CRITICAL: Database initialization failed. Server not started.');
  console.error(err);
  process.exit(1);
});




