const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const chemicalRoutes = require('./routes/chemicals');
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const containerRoutes = require('./routes/containers');
const batchRoutes = require('./routes/batches');
const requestRoutes = require('./routes/requests');
const expiryRoutes = require('./routes/expiry');
const notificationRoutes = require('./routes/notifications');
const locationRoutes = require('./routes/locations');
const { initExpirySchedule, runExpiryCheck } = require('./utils/expiryWorker');



const path = require('path');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize Database
initDb().then(() => {
  console.log('Database initialized successfully.');
  initExpirySchedule();
  runExpiryCheck(); // Run immediate check on startup
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chemicals', chemicalRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/locations', locationRoutes);



app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
