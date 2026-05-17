const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const batchController = require('../controllers/batch/batchController');

// Enforce lab scoping for all batch routes
router.use(authenticate, requireLabScope);

// Get all batches
router.get('/', authorize(PERMISSIONS.VIEW_CHEMICALS), batchController.getBatches);

// Get a single batch
router.get('/:batch_number', authorize(PERMISSIONS.VIEW_CHEMICALS), batchController.getBatch);

// Add new batch
router.post('/', authorize(PERMISSIONS.CREATE_CHEMICAL), batchController.createBatch);

// Update batch
router.put('/:batch_number', authorize(PERMISSIONS.EDIT_CHEMICAL), batchController.updateBatch);

// Delete batch
router.delete('/:batch_number', authorize(PERMISSIONS.DELETE_CHEMICAL), batchController.deleteBatch);

module.exports = router;



