const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const requestController = require('../controllers/request/requestController');

router.use(authenticate, requireLabScope);

/**
 * Get the FIFO-correct container for a chemical.
 */
router.get('/fifo-container', requestController.getFifoContainer);

// Submit a request (Technician)
router.post('/', authorize(PERMISSIONS.SUBMIT_REQUEST), requestController.submitRequest);

// Get all requests (Admins/Managers see all, Technicians see theirs)
router.get('/', requestController.getRequests);

// Approve a request
router.patch('/:id/approve', authorize(PERMISSIONS.APPROVE_REQUEST), requestController.approveRequest);

// Reject a request
router.patch('/:id/reject', authorize(PERMISSIONS.APPROVE_REQUEST), requestController.rejectRequest);

module.exports = router;


