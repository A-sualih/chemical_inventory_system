const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const expiryController = require('../controllers/expiry/expiryController');

router.use(authenticate, requireLabScope);

router.get('/summary', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.VIEW_SAFETY_INFO), expiryController.getExpirySummary);
router.delete('/purge-expired', authorize(PERMISSIONS.DELETE_CHEMICAL), expiryController.purgeExpired);
router.delete('/:type/:id', authorize(PERMISSIONS.DELETE_CHEMICAL), expiryController.deleteExpiryRecord);

module.exports = router;
