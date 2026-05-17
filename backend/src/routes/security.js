const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const securityController = require('../controllers/security/securityController');

/**
 * @route GET /api/security/status
 * @desc Get overall security posture and stats
 * @access Admin
 */
router.get('/status', authenticate, authorize(PERMISSIONS.MANAGE_SECURITY), securityController.getSecurityStatus);

/**
 * @route GET /api/security/backups
 * @desc List all available backups
 * @access Admin
 */
router.get('/backups', authenticate, authorize(PERMISSIONS.PERFORM_BACKUP), securityController.listBackups);

/**
 * @route POST /api/security/backups
 * @desc Trigger a new manual backup
 * @access Admin
 */
router.post('/backups', authenticate, authorize(PERMISSIONS.PERFORM_BACKUP), securityController.createBackup);

/**
 * @route POST /api/security/restore
 * @desc Restore system from a specific backup file
 * @access Admin
 */
router.post('/restore', authenticate, authorize(PERMISSIONS.PERFORM_RESTORE), securityController.restoreBackup);

/**
 * @route GET /api/security/roles
 * @desc Get user distribution by role
 * @access Admin
 */
router.get('/roles', authenticate, authorize(PERMISSIONS.MANAGE_USERS), securityController.getRoleStats);

module.exports = router;

