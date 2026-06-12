const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobile/mobileController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');

router.use(authenticate, requireLabScope);

router.get('/scan/:code', authorize(PERMISSIONS.VIEW_CHEMICALS), mobileController.getScanResult);
router.post('/history/sync', authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.UPDATE_STOCK), mobileController.syncHistory);

module.exports = router;
