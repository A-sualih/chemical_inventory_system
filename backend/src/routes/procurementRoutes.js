const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/procurement/procurementController');
const { authenticate, authorize, authorizeRoles } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS, ROLES } = require('../config/roles');

const labManagerOnly = authorizeRoles(ROLES.LAB_MANAGER);
const canView = authorize(PERMISSIONS.VIEW_CHEMICALS, PERMISSIONS.VIEW_FINANCIALS);
const canEdit = authorize(PERMISSIONS.EDIT_CHEMICAL, PERMISSIONS.VIEW_FINANCIALS);

router.use(authenticate, requireLabScope, labManagerOnly);

router.get('/suppliers', canView, ctrl.getSuppliers);
router.get('/suppliers/rankings', canView, ctrl.getSupplierRankings);
router.get('/suppliers/:id', canView, ctrl.getSupplierById);
router.get('/suppliers/:id/history', canView, ctrl.getSupplierHistory);
router.post('/suppliers', canEdit, ctrl.createSupplier);
router.put('/suppliers/:id', canEdit, ctrl.updateSupplier);
router.put('/suppliers/:id/blacklist', canEdit, ctrl.blacklistSupplier);
router.delete('/suppliers/:id', canEdit, ctrl.deleteSupplier);

router.get('/orders', canView, ctrl.getPurchaseOrders);
router.get('/orders/:id', canView, ctrl.getPurchaseOrderById);
router.post('/orders', canEdit, ctrl.createPurchaseOrder);
router.put('/orders/:id', canEdit, ctrl.updatePurchaseOrder);
router.put('/orders/:id/status', canEdit, ctrl.updatePurchaseOrderStatus);
router.delete('/orders/:id', canEdit, ctrl.deletePurchaseOrder);

router.get('/shipments', canView, ctrl.getShipments);
router.put('/shipments/:poId', canEdit, ctrl.updateShipment);

router.get('/reviews', canView, ctrl.getVendorReviews);
router.post('/reviews', canEdit, ctrl.createVendorReview);

router.get('/analytics', authorize(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_FINANCIALS), ctrl.getProcurementAnalytics);
router.get('/logs', authorize(PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.VIEW_FINANCIALS), ctrl.getProcurementLogs);

module.exports = router;
