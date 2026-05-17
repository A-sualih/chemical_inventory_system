const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const safetyController = require('../controllers/safety/safetyController');

// Apply Lab Scope Check to all safety operations
router.use(authenticate, requireLabScope);

// Get Safety Dashboard Overview
router.get('/dashboard', safetyController.getSafetyDashboard);

// Check Storage Incompatibility for a specific location
router.get('/check-incompatibility/:location', safetyController.checkIncompatibility);

// Global Incompatibility Matrix (Rules)
router.get('/matrix', safetyController.getIncompatibilityMatrix);

// GET: Export SDS PDF
router.get('/export-sds/:id', safetyController.exportSdsPdf);

// Global Incompatibility Scan — all locations
router.get('/incompatibility/global', safetyController.globalIncompatibilityScan);

module.exports = router;




