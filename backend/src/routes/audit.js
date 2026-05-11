const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const auditController = require('../controllers/audit/auditController');

/**
 * @route GET /api/audit
 * @desc Get audit logs with filtering
 * @access Admin (VIEW_AUDIT_LOGS)
 */
router.get('/', authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOGS), auditController.getAuditLogs);
router.get('/export/excel', authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOGS), auditController.exportAuditLogsExcel);
router.get('/export/pdf', authenticate, authorize(PERMISSIONS.VIEW_AUDIT_LOGS), auditController.exportAuditLogsPdf);

module.exports = router;


