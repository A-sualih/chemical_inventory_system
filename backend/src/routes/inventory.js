const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const inventoryController = require('../controllers/inventory/inventoryController');

// Get all chemicals
router.get('/chemicals', authenticate, inventoryController.getChemicals);

// Add new chemical
router.post('/chemicals', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), inventoryController.createChemical);

// Update chemical
router.put('/chemicals/:id', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), inventoryController.updateChemical);

// Transaction Logic (IN/OUT/TRANSFER/DISPOSAL)
router.post('/transaction', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.handleTransaction);

// Get all inventory logs
router.get('/logs', authenticate, inventoryController.getLogs);

// Get inventory logs for a specific chemical
router.get('/logs/:id', authenticate, inventoryController.getLogsByChemical);

// FIFO Auto-Usage Engine Endpoint
router.post('/fifo-usage', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.handleFifoUsage);

// Quick Scan Action (Fast Check-In/Check-Out)
router.post('/quick-scan', authenticate, authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.quickScan);

module.exports = router;

module.exports = router;



