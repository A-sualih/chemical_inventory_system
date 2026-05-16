const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const reportController = require('../controllers/report/reportController');

// GET /api/reports/inventory - Current Stock Summary
router.get('/inventory', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), reportController.getInventoryReport);

// GET /api/reports/usage - Consumption Trends
router.get('/usage', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), reportController.getUsageReport);

// GET /api/reports/disposal - Disposal Analytics
router.get('/disposal', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), reportController.getDisposalReport);

// GET /api/reports/hazards - Risk Breakdown
router.get('/hazards', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), reportController.getHazardReport);

// GET /api/reports/export/excel
router.get('/export/excel', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), reportController.exportExcel);

// GET /api/reports/export/pdf
router.get('/export/pdf', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), reportController.exportPdf);

// GET /api/reports/export/csv
router.get('/export/csv', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), reportController.exportCsv);

module.exports = router;



