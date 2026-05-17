const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory/transactionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');

// All transaction routes require authentication and laboratory scope
router.use(authenticate, requireLabScope);

// Fast Track Detection
router.get('/scan/:barcode', ctrl.getChemicalByBarcode);

// Check-Out / Check-In
router.post('/checkout', ctrl.checkOut);
router.post('/checkin',  ctrl.checkIn);

// History & Logs
router.get('/history', ctrl.getTransactionHistory);

module.exports = router;

