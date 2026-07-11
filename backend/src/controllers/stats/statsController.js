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

exports.keepAlive = async (req, res) => {
  try {
    // Run a lightweight database query to keep connection active
    const chemicalCount = await Chemical.countDocuments({ archived: false });
    res.json({
      success: true,
      message: 'Keep-alive database query successful',
      schemaStatus: 'online',
      data: {
        activeCount: chemicalCount
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Keep-alive database query failed:', error);
    res.status(500).json({
      success: false,
      message: 'Keep-alive database query failed',
      error: error.message
    });
  }
};
