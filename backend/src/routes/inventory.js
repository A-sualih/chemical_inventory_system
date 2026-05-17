const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const inventoryController = require('../controllers/inventory/inventoryController');

router.use(authenticate, requireLabScope);

// Get all chemicals
router.get('/chemicals', inventoryController.getChemicals);

// Add new chemical
router.post('/chemicals', authorize(PERMISSIONS.CREATE_CHEMICAL), inventoryController.createChemical);

// Update chemical
router.put('/chemicals/:id', authorize(PERMISSIONS.EDIT_CHEMICAL), inventoryController.updateChemical);

// Transaction Logic (IN/OUT/TRANSFER/DISPOSAL)
router.post('/transaction', authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.handleTransaction);

// Get all inventory logs
router.get('/logs', inventoryController.getLogs);

// Get inventory logs for a specific chemical
router.get('/logs/:id', inventoryController.getLogsByChemical);

// FIFO Auto-Usage Engine Endpoint
router.post('/fifo-usage', authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.handleFifoUsage);

// Quick Scan Action (Fast Check-In/Check-Out)
router.post('/quick-scan', authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.quickScan);

module.exports = router;

module.exports = router;




