const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobile/mobileController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');

// All mobile endpoints require authentication and lab scoping
router.use(authenticate);
router.use(requireLabScope);

/**
 * @route   GET /api/mobile/scan/:code
 * @desc    Rapid interceptor for mobile scanning
 */
router.get('/scan/:code', authorize('view_chemical'), mobileController.getScanResult);

/**
 * @route   POST /api/mobile/history/sync
 * @desc    Sync offline scans from mobile devices
 */
router.post('/history/sync', mobileController.syncHistory);

module.exports = router;
