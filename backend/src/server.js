const app = require('./app');
const { initDb } = require('./config/db');
const { initExpirySchedule, runExpiryCheck } = require('./jobs/expiryWorker');

const PORT = process.env.PORT || 5001;

// Initialize Database
initDb().then(() => {
  console.log('Database initialized successfully.');
  initExpirySchedule();
  runExpiryCheck(); // Run immediate check on startup
}).catch(err => {
  console.error('Database initialization failed:', err);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


