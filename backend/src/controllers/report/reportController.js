const Chemical = require('../../models/Chemical');
const InventoryLog = require('../../models/InventoryLog');
const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

const getDateRange = (start, end) => {
  const startDate = (start && start !== '') ? new Date(start) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const endDate = (end && end !== '') ? new Date(end) : new Date();
  
  if (endDate instanceof Date && !isNaN(endDate)) {
    endDate.setHours(23, 59, 59, 999);
  }

  return { $gte: startDate, $lte: endDate };
};

exports.getInventoryReport = async (req, res) => {
  try {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    
    const nearExpiryThreshold = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
    const nearExpiryCutoff = new Date(now.getTime() + (nearExpiryThreshold + 1) * 24 * 60 * 60 * 1000);

    const totalChemicals = await Chemical.countDocuments({ archived: false });
    
    const lowStock = await Chemical.countDocuments({ 
      archived: false,
      $expr: { $lte: ["$quantity", { $ifNull: ["$threshold", 5] }] },
      quantity: { $gt: 0 }
    });

    const expired = await Chemical.countDocuments({ 
      archived: false, 
      expiry_date: { $lt: now }
    });

    const nearExpiry = await Chemical.countDocuments({ 
      archived: false, 
      expiry_date: { $gte: now, $lte: nearExpiryCutoff }
    });

    const hazardStats = await Chemical.aggregate([
      { $match: { archived: false } },
      { $unwind: '$ghs_classes' },
      { $group: { _id: '$ghs_classes', count: { $sum: 1 } } }
    ]);

    const locationStats = await Chemical.aggregate([
      { $match: { archived: false } },
      { $group: { _id: '$building', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const expiredList = await Chemical.find({ 
      archived: false, 
      expiry_date: { $lt: now }
    }).select('name id expiry_date location batch_number').lean();

    const nearExpiryList = await Chemical.find({ 
      archived: false, 
      expiry_date: { $gte: now, $lte: nearExpiryCutoff }
    }).select('name id expiry_date location batch_number').lean();

    const lowStockList = await Chemical.find({
      archived: false,
      $expr: { $lte: ["$quantity", { $ifNull: ["$threshold", 5] }] },
      quantity: { $gt: 0 }
    }).select('name id quantity unit').lean();

    res.json({
      summary: { totalChemicals, lowStock, expired, nearExpiry },
      hazards: hazardStats,
      locations: locationStats,
      lists: {
        expired: expiredList,
        nearExpiry: nearExpiryList,
        lowStock: lowStockList
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUsageReport = async (req, res) => {
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
};

exports.getDisposalReport = async (req, res) => {
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
};

exports.getHazardReport = async (req, res) => {
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
};

exports.exportExcel = async (req, res) => {
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
};

exports.exportPdf = async (req, res) => {
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

    autoTable(doc, {
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
};

exports.exportCsv = async (req, res) => {
  try {
    const chemicals = await Chemical.find({ archived: false });
    
    let csv = 'ID,Name,CAS Number,Status,Quantity,Unit,Location\n';
    
    chemicals.forEach(c => {
      const row = [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        c.cas_number || 'N/A',
        c.status,
        c.quantity,
        c.unit,
        `"${(c.location || 'Unassigned').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
