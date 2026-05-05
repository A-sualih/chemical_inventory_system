const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const notificationController = require('../controllers/notification/notificationController');

// GET /api/notifications - Get notifications for the current user
router.get('/', authenticate, notificationController.getNotifications);

// GET /api/notifications/unread - Get unread count
router.get('/unread', authenticate, notificationController.getUnreadCount);

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// PATCH /api/notifications/:id/dismiss - Dismiss notification
router.patch('/:id/dismiss', authenticate, notificationController.dismissNotification);

// DELETE /api/notifications/cleanup - Admin cleanup of old notifications
router.delete('/cleanup', authenticate, authorize(PERMISSIONS.DELETE_CHEMICAL), notificationController.cleanupNotifications);

// POST /api/notifications/test - Trigger a test notification for debugging
router.post('/test', authenticate, authorize(PERMISSIONS.EDIT_CHEMICAL), notificationController.triggerTestNotification);

module.exports = router;



