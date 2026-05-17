const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profile/profileController');

const router = express.Router();

// GET profile
router.get('/me', authenticate, profileController.getProfile);

// PUT profile
router.put('/me', authenticate, profileController.updateProfile);

module.exports = router;

