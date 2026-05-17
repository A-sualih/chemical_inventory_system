const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireLabScope } = require('../middleware/labScope');
const { PERMISSIONS } = require('../config/roles');
const reportController = require('../controllers/report/reportController');

// All reports are scoped to the laboratory level
router.use(authenticate, requireLabScope);

// GET /api/reports/inventory - Current Stock Summary
router.get('/inventory', authorize(PERMISSIONS.VIEW_REPORTS), reportController.getInventoryReport);

// GET /api/reports/usage - Consumption Trends
router.get('/usage', authorize(PERMISSIONS.VIEW_REPORTS), reportController.getUsageReport);

// GET /api/reports/disposal - Disposal Analytics
router.get('/disposal', authorize(PERMISSIONS.VIEW_REPORTS), reportController.getDisposalReport);

// GET /api/reports/hazards - Risk Breakdown
router.get('/hazards', authorize(PERMISSIONS.VIEW_REPORTS), reportController.getHazardReport);

// GET /api/reports/export/excel
router.get('/export/excel', authorize(PERMISSIONS.VIEW_REPORTS), reportController.exportExcel);

// GET /api/reports/export/pdf
router.get('/export/pdf', authorize(PERMISSIONS.VIEW_REPORTS), reportController.exportPdf);

// GET /api/reports/export/csv
router.get('/export/csv', authorize(PERMISSIONS.VIEW_REPORTS), reportController.exportCsv);

module.exports = router;



