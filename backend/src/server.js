const app = require('./app');
const { initDb } = require('./config/db');
const { initExpirySchedule, runExpiryCheck } = require('./jobs/expiryWorker');

const PORT = process.env.PORT || 5001;

// Initialize Database
// Initialize Database and Start Server
initDb().then(() => {
  console.log('Database initialized successfully.');
  initExpirySchedule();
  runExpiryCheck(); // Run immediate check on startup
  
  // Only start listening AFTER DB is ready
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('CRITICAL: Database initialization failed. Server not started.');
  console.error(err);
  process.exit(1); // Exit with error so nodemon/system knows it failed
});


