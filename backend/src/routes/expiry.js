const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const expiryController = require('../controllers/expiry/expiryController');

/**
 * @route GET /api/expiry/summary
 * @desc Get all batches and containers with expiry status, sorted by nearest expiry
 */
router.get('/summary', authenticate, expiryController.getExpirySummary);

/**
 * @route DELETE /api/expiry/purge-expired
 * @desc  Bulk-delete ALL expired batches, containers and their parent Chemical records
 */
router.delete('/purge-expired', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), expiryController.purgeExpired);

/**
 * @route DELETE /api/expiry/:type/:id
 * @desc  Delete a single expired Batch or Container (and its Chemical if orphaned)
 */
router.delete('/:type/:id', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), expiryController.deleteExpiryRecord);

module.exports = router;



