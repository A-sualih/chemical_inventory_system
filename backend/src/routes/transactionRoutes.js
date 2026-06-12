const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory/transactionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');

router.use(authenticate, requireLabScope);

router.get('/scan/:barcode', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.UPDATE_STOCK), ctrl.getChemicalByBarcode);
router.post('/checkout', authorize(PERMISSIONS.UPDATE_STOCK), ctrl.checkOut);
router.post('/checkin', authorize(PERMISSIONS.UPDATE_STOCK), ctrl.checkIn);
router.get('/history', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.VIEW_AUDIT_LOGS), ctrl.getTransactionHistory);

module.exports = router;
