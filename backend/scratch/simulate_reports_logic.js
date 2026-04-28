const mongoose = require('mongoose');
const path = require('path');
const Chemical = require('../models/Chemical');
const InventoryLog = require('../models/InventoryLog');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function simulateReportLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('--- Inventory Summary ---');
    const totalChemicals = await Chemical.countDocuments({ archived: false });
    const lowStock = await Chemical.countDocuments({ status: 'Low Stock', archived: false });
    const expired = await Chemical.countDocuments({ status: 'Expired', archived: false });
    const nearExpiry = await Chemical.countDocuments({ status: 'Near Expiry', archived: false });
    console.log({ totalChemicals, lowStock, expired, nearExpiry });

    console.log('--- Hazard Distribution ---');
    const hazardStats = await Chemical.aggregate([
      { $match: { archived: false } },
      { $unwind: '$ghs_classes' },
      { $group: { _id: '$ghs_classes', count: { $sum: 1 } } }
    ]);
    console.log(hazardStats);

    console.log('--- Usage Stats ---');
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateRange = { $gte: oneMonthAgo, $lte: new Date() };

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
    console.log(usageStats);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

simulateReportLogic();
