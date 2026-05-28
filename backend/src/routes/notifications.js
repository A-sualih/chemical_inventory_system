const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireAdmin } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const notificationController = require('../controllers/notification/notificationController');

router.use(authenticate, requireLabScope);

router.get('/', notificationController.getNotifications);
router.get('/unread', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/:id/dismiss', notificationController.dismissNotification);

router.delete('/cleanup', requireAdmin, notificationController.cleanupNotifications);
router.post('/test', requireAdmin, notificationController.triggerTestNotification);
router.post('/test/:type', requireAdmin, notificationController.triggerTypedTestNotification);

module.exports = router;
