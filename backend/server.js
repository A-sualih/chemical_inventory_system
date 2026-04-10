const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const chemicalRoutes = require('./routes/chemicals');
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Initialize Database
initDb().then(() => {
  console.log('Database initialized successfully.');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chemicals', chemicalRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
