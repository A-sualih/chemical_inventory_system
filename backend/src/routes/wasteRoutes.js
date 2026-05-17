const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/waste/wasteController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');

// All waste routes require authentication and lab scope
router.use(authenticate, requireLabScope);

// Disposal Records
router.get('/disposals',                authorize(PERMISSIONS.VIEW_CHEMICALS), ctrl.getDisposals);
router.post('/disposals',               authorize(PERMISSIONS.MANAGE_WASTE, PERMISSIONS.SUBMIT_REQUEST), ctrl.createDisposalRequest);
router.get('/disposals/:id/fifo-preview', authorize(PERMISSIONS.APPROVE_DISPOSAL), ctrl.getDisposalFifoPreview);
router.put('/disposals/:id/approve',    authorize(PERMISSIONS.APPROVE_DISPOSAL), ctrl.approveDisposal);
router.put('/disposals/:id/reject',     authorize(PERMISSIONS.APPROVE_DISPOSAL), ctrl.rejectDisposal);
router.put('/disposals/:id/complete',   authorize(PERMISSIONS.MANAGE_WASTE), ctrl.completeDisposal);
router.delete('/disposals/:id',            authorize(PERMISSIONS.MANAGE_WASTE), ctrl.deleteDisposal);
router.post('/disposals/purge',         authorize(PERMISSIONS.MANAGE_SETTINGS), ctrl.purgeAllDisposals);

// Compliance Logs
router.get('/compliance',               authorize(PERMISSIONS.VIEW_REPORTS), ctrl.getComplianceLogs);
router.post('/compliance',              authorize(PERMISSIONS.MANAGE_WASTE), ctrl.createComplianceLog);
router.put('/compliance/:id/sign',      authorize(PERMISSIONS.APPROVE_DISPOSAL), ctrl.signComplianceLog);

// Permits
router.get('/permits',                  authorize(PERMISSIONS.VIEW_REPORTS), ctrl.getPermits);
router.post('/permits',                 authorize(PERMISSIONS.MANAGE_WASTE), ctrl.createPermit);

// Safety Incidents
router.get('/incidents',                authorize(PERMISSIONS.VIEW_REPORTS), ctrl.getSafetyIncidents);
router.post('/incidents',               authorize(PERMISSIONS.MANAGE_WASTE), ctrl.createSafetyIncident);
router.put('/incidents/:id/impact',     authorize(PERMISSIONS.MANAGE_WASTE), ctrl.updateIncidentImpact);

// Safety Protocols
router.get('/protocols',                authorize(PERMISSIONS.VIEW_CHEMICALS), ctrl.getSafetyProtocols);
router.post('/protocols',               authorize(PERMISSIONS.MANAGE_WASTE), ctrl.createSafetyProtocol);

// Analytics
router.get('/analytics',                authorize(PERMISSIONS.VIEW_REPORTS), ctrl.getWasteAnalytics);

module.exports = router;

