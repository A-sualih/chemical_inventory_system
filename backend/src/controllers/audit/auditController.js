const AuditLog = require('../../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  try {
    const { user, action, targetType, startDate, endDate, limit = 100, page = 1 } = req.query;

    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = { ...labQuery };

    if (user) {
      query.$or = [
        { 'user.name': { $regex: user, $options: 'i' } },
        { 'user.email': { $regex: user, $options: 'i' } }
      ];
    }

    if (action) {
      query.action = action.toUpperCase();
    }

    if (targetType) {
      query['target.type'] = targetType.toLowerCase();
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error('Fetch Audit Logs Error:', err);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
};

const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

exports.exportAuditLogsExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit Trail');

    sheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 25 },
      { header: 'User', key: 'userName', width: 20 },
      { header: 'Role', key: 'userRole', width: 15 },
      { header: 'Action', key: 'action', width: 12 },
      { header: 'Target Type', key: 'targetType', width: 15 },
      { header: 'Target Name', key: 'targetName', width: 25 },
      { header: 'Details', key: 'details', width: 40 },
      { header: 'IP Address', key: 'ip', width: 15 }
    ];

    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = { ...labQuery };
    const logs = await AuditLog.find(query).sort({ timestamp: -1 });
    logs.forEach(log => {
      sheet.addRow({
        timestamp: log.timestamp.toISOString(),
        userName: log.user.name,
        userRole: log.user.role,
        action: log.action,
        targetType: log.target.type,
        targetName: log.target.name || 'N/A',
        details: log.details,
        ip: log.metadata.ip || 'N/A'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_trail_export.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportAuditLogsPdf = async (req, res) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const query = { ...labQuery };
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(200);

    doc.setFontSize(20);
    doc.text('Chemical Inventory Audit Trail', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text('This document is a certified immutable activity log from the CIMS platform.', 14, 36);

    const tableData = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user.name,
      log.action,
      log.target.type,
      log.target.name || 'N/A',
      log.details
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Timestamp', 'User', 'Action', 'Target', 'Identity', 'Activity Details']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    const pdfBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_trail_export.pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

