const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const settingsController = require('../controllers/settings/settingsController');

const router = express.Router();

// GET settings (public or semi-public so login page can see system name, logo)
// Let's make it public because login page might need logo/system name
router.get('/', settingsController.getSettings);

// PUT update settings (admin only)
router.put('/', authenticate, authorize(PERMISSIONS.MANAGE_SETTINGS), settingsController.updateSettings);

module.exports = router;
