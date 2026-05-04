const mongoose = require('mongoose');
const Chemical = require('../../models/Chemical');
const Container = require('../../models/Container');
const InventoryLog = require('../../models/InventoryLog');
require('dotenv').config();

const healInventory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory');
    console.log("Connected to MongoDB for Inventory Healing...");

    // 1. Heal Containers
    const containers = await Container.find();
    for (const cont of containers) {
      let oldStatus = cont.status;
      
      // Expired / Near Expiry (Priority)
      if (cont.expiry_date) {
        const exp = new Date(cont.expiry_date);
        const now = new Date();
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        if (diff < 0) cont.status = 'Expired';
        else if (diff < 30) cont.status = 'Near Expiry';
      }

      // Empty
      if (cont.quantity <= 0.001) {
        cont.status = 'Empty';
      } 
      // In Use (If quantitiy is less than original estimate or has logs)
      else if (cont.status !== 'Expired' && cont.status !== 'Near Expiry' && cont.status !== 'Damaged') {
         const logs = await InventoryLog.find({ reason: { $regex: cont.container_id, $options: 'i' } });
         if (logs.length > 0) cont.status = 'In Use';
      }

      if (oldStatus !== cont.status) {
        await cont.save();
        console.log(`Healed Container ${cont.container_id}: ${oldStatus} -> ${cont.status}`);
      }
    }

    // 2. Heal Chemicals
    const chemicals = await Chemical.find();
    for (const chem of chemicals) {
      let oldStatus = chem.status;

      if (chem.quantity <= 0.001) {
        chem.status = 'Out of Stock';
      } else {
        // Check if any child containers are "In Use"
        const children = await Container.find({ chemical_id: chem.id });
        const hasOpened = children.some(c => c.status === 'In Use' || c.status === 'Empty');
        
        if (hasOpened) {
          chem.status = 'In Use';
        } else if (chem.quantity < 5) {
          chem.status = 'Low Stock';
        } else {
          chem.status = 'In Stock';
        }
      }

      if (oldStatus !== chem.status) {
        await chem.save();
        console.log(`Healed Chemical ${chem.name}: ${oldStatus} -> ${chem.status}`);
      }
    }

    console.log("Inventory Healing complete.");
    process.exit(0);
  } catch (err) {
    console.error("Healing failed:", err);
    process.exit(1);
  }
};

healInventory();



