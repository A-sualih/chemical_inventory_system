const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const batchController = require('../controllers/batch/batchController');

// Get all batches
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), batchController.getBatches);

// Get a single batch
router.get('/:batch_number', authenticate, authorize(PERMISSIONS.VIEW_CHEMICALS), batchController.getBatch);

// Add new batch
router.post('/', authenticate, authorize(PERMISSIONS.CREATE_CHEMICAL), batchController.createBatch);

// Update batch
router.put('/:batch_number', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), batchController.updateBatch);

// Delete batch
router.delete('/:batch_number', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), batchController.deleteBatch);

module.exports = router;


