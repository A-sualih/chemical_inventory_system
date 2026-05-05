const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const requestController = require('../controllers/request/requestController');

/**
 * Get the FIFO-correct container for a chemical.
 */
router.get('/fifo-container', authenticate, requestController.getFifoContainer);

// Submit a request (Technician)
router.post('/', authenticate, authorize(PERMISSIONS.SUBMIT_REQUEST), requestController.submitRequest);

// Get all requests (Admins/Managers see all, Technicians see theirs)
router.get('/', authenticate, requestController.getRequests);

// Approve a request
router.patch('/:id/approve', authenticate, authorize(PERMISSIONS.APPROVE_REQUEST), requestController.approveRequest);

// Reject a request
router.patch('/:id/reject', authenticate, authorize(PERMISSIONS.APPROVE_REQUEST), requestController.rejectRequest);

module.exports = router;


