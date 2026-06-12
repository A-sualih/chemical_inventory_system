const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const requestController = require('../controllers/request/requestController');
const chemicalRequestController = require('../controllers/request/chemicalRequestController');

router.use(authenticate, requireLabScope);

router.get('/fifo-container', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.SUBMIT_REQUEST), requestController.getFifoContainer);
router.post('/', authorize(PERMISSIONS.SUBMIT_REQUEST), requestController.submitRequest);
router.get('/', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.SUBMIT_REQUEST, PERMISSIONS.APPROVE_REQUEST), requestController.getRequests);
router.patch('/:id/approve', authorize(PERMISSIONS.APPROVE_REQUEST), requestController.approveRequest);
router.patch('/:id/reject', authorize(PERMISSIONS.APPROVE_REQUEST), requestController.rejectRequest);
router.patch('/:id/cancel', authorize(PERMISSIONS.SUBMIT_REQUEST), requestController.cancelRequest);

router.post('/inventory-request', authorize(PERMISSIONS.SUBMIT_REQUEST), chemicalRequestController.submitRequest);
router.get('/inventory-request', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.SUBMIT_REQUEST, PERMISSIONS.APPROVE_REQUEST), chemicalRequestController.getRequests);
router.patch('/inventory-request/:id/reject', authorize(PERMISSIONS.APPROVE_REQUEST), chemicalRequestController.rejectRequest);
router.patch('/inventory-request/:id/buy', authorize(PERMISSIONS.APPROVE_REQUEST), chemicalRequestController.buyRequest);
router.patch('/inventory-request/:id/transfer', authorize(PERMISSIONS.APPROVE_REQUEST), chemicalRequestController.transferRequest);
router.patch('/inventory-request/:id/cancel', authorize(PERMISSIONS.SUBMIT_REQUEST), chemicalRequestController.cancelRequest);

module.exports = router;
