const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats/statsController');
const supportController = require('../controllers/support/supportController');

// GET /api/public/stats
router.get('/stats', statsController.getPublicStats);

// POST /api/public/support
router.post('/support', supportController.createSupportRequest);

module.exports = router;
