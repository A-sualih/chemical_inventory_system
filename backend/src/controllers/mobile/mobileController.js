const Chemical = require('../../models/Chemical');
const Container = require('../../models/Container');
const ScanHistory = require('../../models/ScanHistory');
const mongoose = require('mongoose');

/**
 * Rapid lookup for mobile scanning interception
 * Checks Container ID, Manufacturer Barcode, Chemical ID, and CAS
 */
exports.getScanResult = async (req, res) => {
  try {
    const { code } = req.params;
    const labId = req.user.active_lab;

    // Normalize function to help with URL-based barcodes
    const normalize = (val) => val ? val.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') : val;
    const normalizedCode = normalize(code);

    // 1. Log the scan attempt
    const history = new ScanHistory({
      userId: req.user.id,
      userName: req.user.name,
      barcode: code,
      labId: labId,
      metadata: {
        device: req.headers['user-agent'],
        ip: req.ip
      }
    });

    // 2. Primary Lookup: Container
    let container = await Container.findOne({
      $or: [
        { container_id: code },
        { barcode: code },
        { barcode: normalizedCode }
      ],
      lab: labId
    });

    let chemical;
    let foundType = 'none';

    if (container) {
      foundType = 'container';
      chemical = await Chemical.findOne({ 
        $or: [{ _id: container.chemical_id }, { id: container.chemical_id }] 
      });
    } else {
      // 3. Secondary Lookup: Chemical Global Record
      chemical = await Chemical.findOne({
        $or: [
          { id: code },
          { cas_number: code },
          { barcode: code },
          { barcode: normalizedCode }
        ],
        lab: labId
      });

      if (chemical) {
        foundType = 'chemical';
        // Try to find the first available container for this chemical
        container = await Container.findOne({ 
          chemical_id: chemical.id, 
          status: { $ne: 'Empty' },
          lab: labId 
        });
      }
    }

    if (!chemical) {
      history.status = 'Not Found';
      await history.save();
      return res.status(404).json({
        found: false,
        message: 'Barcode not recognized in this lab.',
        scannedCode: code
      });
    }

    // 4. Finalize Success
    history.status = 'Success';
    history.action = 'Lookup';
    await history.save();

    res.json({
      found: true,
      type: foundType,
      data: {
        chemical: {
          id: chemical.id,
          name: chemical.name,
          cas: chemical.cas_number,
          hazards: chemical.ghs_hazards,
          ppe: chemical.ppe_requirements,
          expiry: chemical.expiry_date,
          sds_url: chemical.sds_file_url
        },
        container: container ? {
          id: container.container_id,
          quantity: container.quantity,
          unit: container.unit,
          status: container.status,
          location: `${container.building} / ${container.room}`
        } : null
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Bulk sync for offline scan history
 */
exports.syncHistory = async (req, res) => {
  try {
    const { scans } = req.body;
    if (!Array.isArray(scans)) return res.status(400).json({ error: 'Invalid scans format' });

    const processedScans = scans.map(s => ({
      ...s,
      userId: req.user.id,
      userName: req.user.name,
      labId: req.user.active_lab
    }));

    await ScanHistory.insertMany(processedScans);
    res.json({ message: `Successfully synced ${processedScans.length} scans.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
