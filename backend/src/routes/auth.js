const express = require('express');
const { authenticate, authorize, requireAdmin } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const authController = require('../controllers/auth/authController');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/labs', authController.getPublicLabs);
router.post('/reset-password', authController.requestPasswordReset);
router.post('/reset-password/:token', authController.resetPassword);

router.get('/users', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.getUsers);
router.delete('/users/:id', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.deleteUser);
router.post('/users/wipe-all', authenticate, requireAdmin, authController.wipeAllUsers);
router.put('/users/:id/role', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.updateUserRole);
router.put('/users/:id/status', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.updateUserStatus);
router.put('/users/:id/reset-password', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.adminResetPassword);

router.post('/mfa/verify', authController.verifyMfa);
router.get('/mfa/setup/totp', authenticate, authController.setupTotp);
router.post('/mfa/enable', authenticate, authController.enableMfa);
router.post('/mfa/disable', authenticate, authController.disableMfa);

// Previously unauthenticated — exposed admin emails. Admin-only now.
router.get('/check-admins-temp', authenticate, requireAdmin, authController.checkAdminsTemp);

module.exports = router;
