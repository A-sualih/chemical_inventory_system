const backupService = require('../../services/backupService');
const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');

exports.getSecurityStatus = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const mfaEnabled = await User.countDocuments({ mfa_enabled: true });
    const lockedUsers = await User.countDocuments({ locked_until: { $gt: new Date() } });
    
    const recentAudit = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(5);

    const backups = await backupService.listBackups();

    res.json({
      mfaRatio: totalUsers > 0 ? (mfaEnabled / totalUsers) * 100 : 0,
      lockedUsers,
      backups: backups.length,
      lastBackup: backups[0] ? backups[0].createdAt : null,
      recentAudit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listBackups = async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createBackup = async (req, res) => {
  try {
    const result = await backupService.createFullBackup();
    
    const { logAudit } = require('../../middleware/authMiddleware');
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'system',
      targetId: 'backup',
      targetName: result.fileName,
      details: `Administrator created a full system backup: ${result.fileName}`
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.restoreBackup = async (req, res) => {
  const { fileName } = req.body;
  if (!fileName) return res.status(400).json({ error: 'File name is required' });

  try {
    const result = await backupService.restoreFromBackup(fileName);
    
    const { logAudit } = require('../../middleware/authMiddleware');
    await logAudit(req, {
      action: 'APPROVE',
      targetType: 'system',
      targetId: 'restore',
      targetName: fileName,
      details: `Administrator restored the system from backup: ${fileName}`
    });

    res.json({ message: 'System restored successfully', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoleStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
