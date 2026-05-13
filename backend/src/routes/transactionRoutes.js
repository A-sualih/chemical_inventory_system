const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory/transactionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

// All transaction routes require authentication
router.use(authenticate);

// Fast Track Detection
router.get('/scan/:barcode', ctrl.getChemicalByBarcode);

// Check-Out / Check-In
router.post('/checkout', ctrl.checkOut);
router.post('/checkin',  ctrl.checkIn);

// History & Logs
router.get('/history', ctrl.getTransactionHistory);

module.exports = router;
