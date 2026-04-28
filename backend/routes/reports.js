const express = require('express');
const router = express.Router();
const Chemical = require('../models/Chemical');
const InventoryLog = require('../models/InventoryLog');
const Disposal = require('../models/Disposal');
const { authenticate, authorize } = require('../authMiddleware');
const { PERMISSIONS } = require('../config/roles');
const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

// Helper to get date range
const getDateRange = (start, end) => {
  const startDate = start ? new Date(start) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const endDate = end ? new Date(end) : new Date();
  return { $gte: startDate, $lte: endDate };
};

// GET /api/reports/inventory - Current Stock Summary
router.get('/inventory', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), async (req, res) => {
  try {
    const totalChemicals = await Chemical.countDocuments({ archived: false });
    const lowStock = await Chemical.countDocuments({ status: 'Low Stock', archived: false });
    const expired = await Chemical.countDocuments({ status: 'Expired', archived: false });
    const nearExpiry = await Chemical.countDocuments({ status: 'Near Expiry', archived: false });

    // Hazard Distribution
    const hazardStats = await Chemical.aggregate([
      { $match: { archived: false } },
      { $unwind: '$ghs_classes' },
      { $group: { _id: '$ghs_classes', count: { $sum: 1 } } }
    ]);

    // Location Distribution
    const locationStats = await Chemical.aggregate([
      { $match: { archived: false } },
      { $group: { _id: '$building', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      summary: { totalChemicals, lowStock, expired, nearExpiry },
      hazards: hazardStats,
      locations: locationStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/usage - Consumption Trends
router.get('/usage', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), async (req, res) => {
  try {
    const { start, end } = req.query;
    const dateRange = getDateRange(start, end);

    const usageStats = await InventoryLog.aggregate([
      { 
        $match: { 
          action: 'OUT',
          createdAt: dateRange 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalQuantity: { $sum: { $abs: "$quantity_change" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topChemicals = await InventoryLog.aggregate([
      { 
        $match: { 
          action: 'OUT',
          createdAt: dateRange 
        } 
      },
      {
        $group: {
          _id: '$chemical_name',
          totalUsed: { $sum: { $abs: "$quantity_change" } }
        }
      },
      { $sort: { totalUsed: -1 } },
      { $limit: 10 }
    ]);

    res.json({ usageStats, topChemicals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/disposal - Disposal Analytics
router.get('/disposal', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), async (req, res) => {
  try {
    const { start, end } = req.query;
    const dateRange = getDateRange(start, end);

    const disposalStats = await InventoryLog.aggregate([
      { 
        $match: { 
          action: 'DISPOSAL',
          createdAt: dateRange 
        } 
      },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $abs: "$quantity_change" } }
        }
      }
    ]);

    res.json(disposalStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/hazards - Risk Breakdown
router.get('/hazards', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), async (req, res) => {
  try {
    const hazards = await Chemical.aggregate([
      { $match: { archived: false } },
      { $unwind: '$ghs_classes' },
      {
        $group: {
          _id: '$ghs_classes',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    res.json(hazards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/excel', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory Report');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'CAS', key: 'cas', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Location', key: 'location', width: 20 }
    ];

    const chemicals = await Chemical.find({ archived: false });
    chemicals.forEach(c => {
      sheet.addRow({
        id: c.id,
        name: c.name,
        cas: c.cas_number,
        status: c.status,
        quantity: c.quantity,
        unit: c.unit,
        location: c.location
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/export/pdf
router.get('/export/pdf', authenticate, authorize(PERMISSIONS.VIEW_REPORTS), async (req, res) => {
  try {
    const doc = new jsPDF();
    const chemicals = await Chemical.find({ archived: false });

    doc.setFontSize(20);
    doc.text('Chemical Inventory Master Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = chemicals.map(c => [
      c.id,
      c.name,
      c.cas_number || 'N/A',
      c.status,
      `${c.quantity} ${c.unit}`,
      c.location || 'Unassigned'
    ]);

    doc.autoTable({
      startY: 40,
      head: [['ID', 'Chemical Name', 'CAS #', 'Status', 'Qty', 'Location']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    const pdfBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

