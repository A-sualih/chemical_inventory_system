const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const supportController = require('../controllers/support/supportController');

const router = express.Router();

router.get('/', authenticate, authorize(PERMISSIONS.MANAGE_SUPPORT), supportController.getSupportRequests);
router.put('/:id/status', authenticate, authorize(PERMISSIONS.MANAGE_SUPPORT), supportController.updateSupportStatus);

module.exports = router;
