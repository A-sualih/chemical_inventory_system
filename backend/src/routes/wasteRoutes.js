const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/waste/wasteController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

// All waste routes require authentication
router.use(authenticate);

// Disposal Records
router.get('/disposals',                authorize(PERMISSIONS.VIEW_CHEMICALS), ctrl.getDisposals);
router.post('/disposals',               authorize(PERMISSIONS.MANAGE_WASTE), ctrl.createDisposalRequest);
router.put('/disposals/:id/approve',    authorize(PERMISSIONS.APPROVE_DISPOSAL), ctrl.approveDisposal);
router.put('/disposals/:id/complete',   authorize(PERMISSIONS.MANAGE_WASTE), ctrl.completeDisposal);

// Compliance Logs
router.get('/compliance',               authorize(PERMISSIONS.VIEW_REPORTS), ctrl.getComplianceLogs);
router.post('/compliance',              authorize(PERMISSIONS.MANAGE_WASTE), ctrl.createComplianceLog);

// Safety Incidents
router.get('/incidents',                authorize(PERMISSIONS.VIEW_REPORTS), ctrl.getSafetyIncidents);
router.post('/incidents',               authorize(PERMISSIONS.MANAGE_WASTE), ctrl.createSafetyIncident);

// Analytics
router.get('/analytics',                authorize(PERMISSIONS.VIEW_REPORTS), ctrl.getWasteAnalytics);

module.exports = router;
