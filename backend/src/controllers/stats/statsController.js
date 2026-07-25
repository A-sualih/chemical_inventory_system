const mongoose = require('mongoose');
const Chemical = require('../../models/Chemical');
const Lab = require('../../models/Lab');
const Container = require('../../models/Container');

exports.getPublicStats = async (req, res) => {
  try {
    const chemicalCount = await Chemical.countDocuments({ archived: false });
    const labCount = await Lab.countDocuments({});
    const vesselCount = await Container.countDocuments({ status: { $ne: 'Empty' } });
    
    // Safety Compliance: % of chemicals with SDS attached
    const totalChemicals = await Chemical.countDocuments({ archived: false });
    const sdsChemicals = await Chemical.countDocuments({ archived: false, sds_attached: true });
    
    let safetyCompliance = 100;
    if (totalChemicals > 0) {
      safetyCompliance = Math.round((sdsChemicals / totalChemicals) * 100);
    }

    res.json({
      success: true,
      data: {
        chemicalsTracked: chemicalCount,
        activeLabs: labCount,
        vesselsManaged: vesselCount,
        safetyCompliance: `${safetyCompliance}%`
      }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

/** Read-only MongoDB ping — no insert/update/delete */
exports.keepAlive = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is not connected',
        timestamp: new Date(),
      });
    }

    const result = await mongoose.connection.db.admin().command({ ping: 1 });
    res.json({
      success: result?.ok === 1,
      message: 'Keep-alive ping successful (no data changed)',
      schemaStatus: 'online',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Keep-alive database ping failed:', error);
    res.status(500).json({
      success: false,
      message: 'Keep-alive database ping failed',
      error: error.message,
    });
  }
};
