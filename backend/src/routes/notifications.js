const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const notificationController = require('../controllers/notification/notificationController');

router.use(authenticate, requireLabScope);

// GET /api/notifications - Get notifications for the current user
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread - Get unread count
router.get('/unread', notificationController.getUnreadCount);

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', notificationController.markAsRead);

// PATCH /api/notifications/:id/dismiss - Dismiss notification
router.patch('/:id/dismiss', notificationController.dismissNotification);

// DELETE /api/notifications/cleanup - Admin cleanup of old notifications
router.delete('/cleanup', authorize(PERMISSIONS.DELETE_CHEMICAL), notificationController.cleanupNotifications);

// POST /api/notifications/test - Trigger a generic SYSTEM test notification
router.post('/test', authorize(PERMISSIONS.EDIT_CHEMICAL), notificationController.triggerTestNotification);

// POST /api/notifications/test/:type - Trigger a specific alert type for testing
// e.g. POST /api/notifications/test/DISPOSAL
// e.g. POST /api/notifications/test/SPILL_INCIDENT
router.post('/test/:type', authorize(PERMISSIONS.EDIT_CHEMICAL), notificationController.triggerTypedTestNotification);

module.exports = router;




