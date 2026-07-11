const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats/statsController');
const supportController = require('../controllers/support/supportController');

// GET /api/public/stats
router.get('/stats', statsController.getPublicStats);

// GET /api/public/keep-alive
router.get('/keep-alive', statsController.keepAlive);

// POST /api/public/support
router.post('/support', supportController.createSupportRequest);

module.exports = router;
