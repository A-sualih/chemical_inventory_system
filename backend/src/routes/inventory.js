const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const inventoryController = require('../controllers/inventory/inventoryController');

router.use(authenticate, requireLabScope);

router.get('/chemicals', authorize(PERMISSIONS.VIEW_CHEMICALS), inventoryController.getChemicals);
router.post('/chemicals', authorize(PERMISSIONS.CREATE_CHEMICAL), inventoryController.createChemical);
router.put('/chemicals/:id', authorize(PERMISSIONS.EDIT_CHEMICAL), inventoryController.updateChemical);
router.post('/transaction', authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.handleTransaction);
router.get('/logs', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.VIEW_AUDIT_LOGS), inventoryController.getLogs);
router.get('/logs/:id', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.VIEW_AUDIT_LOGS), inventoryController.getLogsByChemical);
router.post('/fifo-usage', authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.handleFifoUsage);
router.post('/quick-scan', authorize(PERMISSIONS.UPDATE_STOCK), inventoryController.quickScan);

module.exports = router;
