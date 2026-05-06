const express = require('express');
const router = express.Router();
const procurementController = require('../controllers/procurement/procurementController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

// Only Admins or Lab Managers can typically manage procurement
const requireProcurementAccess = authorize(PERMISSIONS.EDIT_CHEMICAL); 

// Supplier Routes
router.get('/suppliers', authenticate, procurementController.getSuppliers);
router.post('/suppliers', authenticate, requireProcurementAccess, procurementController.createSupplier);
router.put('/suppliers/:id', authenticate, requireProcurementAccess, procurementController.updateSupplier);

// Purchase Order Routes
router.get('/orders', authenticate, procurementController.getPurchaseOrders);
router.post('/orders', authenticate, requireProcurementAccess, procurementController.createPurchaseOrder);
router.put('/orders/:id/status', authenticate, requireProcurementAccess, procurementController.updatePurchaseOrderStatus);

module.exports = router;
