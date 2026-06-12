const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const safetyController = require('../controllers/safety/safetyController');

router.use(authenticate, requireLabScope);

router.get('/dashboard', authorize(PERMISSIONS.VIEW_SAFETY_INFO), safetyController.getSafetyDashboard);
router.get('/check-incompatibility/:location', authorize(PERMISSIONS.VIEW_SAFETY_INFO), safetyController.checkIncompatibility);
router.get('/matrix', authorize(PERMISSIONS.VIEW_SAFETY_INFO), safetyController.getIncompatibilityMatrix);
router.get('/export-sds/:id', authorize(PERMISSIONS.VIEW_SAFETY_INFO, PERMISSIONS.VIEW_CHEMICALS), safetyController.exportSdsPdf);
router.get('/incompatibility/global', authorize(PERMISSIONS.VIEW_SAFETY_INFO), safetyController.globalIncompatibilityScan);

module.exports = router;
