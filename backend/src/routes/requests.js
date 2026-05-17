const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const requestController = require('../controllers/request/requestController');
const chemicalRequestController = require('../controllers/request/chemicalRequestController');

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

// Cancel a request (Requester)
router.patch('/:id/cancel', requestController.cancelRequest);

// --- Non-Existing Chemical Requests (New Feature) ---
router.post('/inventory-request', chemicalRequestController.submitRequest);
router.get('/inventory-request', chemicalRequestController.getRequests);
router.patch('/inventory-request/:id/reject', authorize(PERMISSIONS.APPROVE_REQUEST), chemicalRequestController.rejectRequest);
router.patch('/inventory-request/:id/buy', authorize(PERMISSIONS.APPROVE_REQUEST), chemicalRequestController.buyRequest);
router.patch('/inventory-request/:id/transfer', authorize(PERMISSIONS.APPROVE_REQUEST), chemicalRequestController.transferRequest);
router.patch('/inventory-request/:id/cancel', chemicalRequestController.cancelRequest);

module.exports = router;


