const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const supportController = require('../controllers/support/supportController');

const router = express.Router();

// Support Inbox is Admin-only
router.get('/', authenticate, requireAdmin, supportController.getSupportRequests);
router.put('/:id/status', authenticate, requireAdmin, supportController.updateSupportStatus);

module.exports = router;
