const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const safetyController = require('../controllers/safety/safetyController');

// Get Safety Dashboard Overview
router.get('/dashboard', authenticate, safetyController.getSafetyDashboard);

// Check Storage Incompatibility for a specific location
router.get('/check-incompatibility/:location', authenticate, safetyController.checkIncompatibility);

// Global Incompatibility Matrix (Rules)
router.get('/matrix', authenticate, safetyController.getIncompatibilityMatrix);

// GET: Export SDS PDF
router.get('/export-sds/:id', authenticate, safetyController.exportSdsPdf);

// Global Incompatibility Scan — all locations
router.get('/incompatibility/global', authenticate, safetyController.globalIncompatibilityScan);

module.exports = router;



