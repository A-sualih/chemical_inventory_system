const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/procurement/procurementController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');

const canEdit = authorize(PERMISSIONS.EDIT_CHEMICAL);
const adminOnly = authorize(PERMISSIONS.MANAGE_USERS);

// ─── Supplier Routes ─────────────────────────────────────────────────────────
router.get('/suppliers',              authenticate, ctrl.getSuppliers);
router.get('/suppliers/rankings',     authenticate, ctrl.getSupplierRankings);
router.get('/suppliers/:id',          authenticate, ctrl.getSupplierById);
router.get('/suppliers/:id/history',  authenticate, ctrl.getSupplierHistory);
router.post('/suppliers',             authenticate, canEdit, ctrl.createSupplier);
router.put('/suppliers/:id',          authenticate, canEdit, ctrl.updateSupplier);
router.put('/suppliers/:id/blacklist',authenticate, adminOnly, ctrl.blacklistSupplier);
router.delete('/suppliers/:id',       authenticate, adminOnly, ctrl.deleteSupplier);

// ─── Purchase Order Routes ────────────────────────────────────────────────────
router.get('/orders',                 authenticate, ctrl.getPurchaseOrders);
router.get('/orders/:id',             authenticate, ctrl.getPurchaseOrderById);
router.post('/orders',                authenticate, canEdit, ctrl.createPurchaseOrder);
router.put('/orders/:id',             authenticate, canEdit, ctrl.updatePurchaseOrder);
router.put('/orders/:id/status',      authenticate, canEdit, ctrl.updatePurchaseOrderStatus);
router.delete('/orders/:id',          authenticate, adminOnly, ctrl.deletePurchaseOrder);

// ─── Shipment Tracking ────────────────────────────────────────────────────────
router.get('/shipments',              authenticate, ctrl.getShipments);
router.put('/shipments/:poId',        authenticate, canEdit, ctrl.updateShipment);

// ─── Vendor Performance ───────────────────────────────────────────────────────
router.get('/reviews',                authenticate, ctrl.getVendorReviews);
router.post('/reviews',               authenticate, canEdit, ctrl.createVendorReview);

// ─── Analytics & Logs ─────────────────────────────────────────────────────────
router.get('/analytics',              authenticate, ctrl.getProcurementAnalytics);
router.get('/logs',                   authenticate, ctrl.getProcurementLogs);

module.exports = router;
