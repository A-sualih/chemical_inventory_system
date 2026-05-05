const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const authController = require('../controllers/auth/authController');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/reset-password', authController.requestPasswordReset);
router.post('/reset-password/:token', authController.resetPassword);

router.get('/users', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.getUsers);
router.delete('/users/:id', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.deleteUser);
router.post('/users/wipe-all', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), authController.wipeAllUsers);
router.put('/users/:id/role', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.updateUserRole);
router.put('/users/:id/status', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.updateUserStatus);
router.put('/users/:id/reset-password', authenticate, authorize(PERMISSIONS.ASSIGN_ROLES), authController.adminResetPassword);

router.post('/mfa/verify', authController.verifyMfa);
router.get('/mfa/setup/totp', authenticate, authController.setupTotp);
router.post('/mfa/enable', authenticate, authController.enableMfa);
router.post('/mfa/disable', authenticate, authController.disableMfa);

router.get('/check-admins-temp', authController.checkAdminsTemp);

module.exports = router;


