const Chemical = require('../../models/Chemical');
const QRCode = require('qrcode');
const { convertToBase, getBaseUnit } = require('../../utils/unitConverter');
const { syncBatch } = require('../../services/batchService');
const { syncContainers } = require('../../services/containerService');
const { checkChemicalExpiry } = require('../../services/expiryService');
const { logAudit } = require('../../middleware/authMiddleware');

exports.getStats = async (req, res) => {
  try {
    const labQuery = (req.user.role === 'Admin' && !req.activeLabId) ? {} : { lab: req.activeLabId };
    const totalCount = await Chemical.countDocuments({ archived: false, ...labQuery });
    const flammables = await Chemical.countDocuments({ ghs_classes: "Flammable", archived: false, ...labQuery });
    
    const allHazards = await Chemical.aggregate([
      { $match: { archived: false, ...labQuery } },
      { $unwind: "$ghs_classes" },
      { $group: { _id: "$ghs_classes", count: { $sum: 1 } } }
    ]);
    const hazardSummary = allHazards.map(h => ({ id: h._id, count: h.count }));
    const lowStock = await Chemical.countDocuments({ status: "Low Stock", archived: false, ...labQuery });
    
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiring = await Chemical.find({
      archived: false,
      ...labQuery,
      expiry_date: { $gte: now, $lte: in90Days }
    }).sort({ expiry_date: 1 }).limit(5).select('name expiry_date ghs_classes location batch_number');

    const expirations = expiring.map(c => {
      const daysLeft = Math.ceil((new Date(c.expiry_date) - now) / (1000 * 60 * 60 * 24));
      return { 
        name: c.name, 
        days: daysLeft, 
        location: c.location || 'Unassigned',
        batch_number: c.batch_number 
      };
    });

    const allChemicals = await Chemical.find({ archived: false, ...labQuery }).select('location quantity');
    const locationMap = {};
    allChemicals.forEach(c => {
      const loc = c.location || 'Unassigned';
      if (!locationMap[loc]) locationMap[loc] = { count: 0, totalQty: 0 };
      locationMap[loc].count += 1;
      locationMap[loc].totalQty += (c.quantity || 0);
    });
    const storageBreakdown = Object.entries(locationMap)
      .map(([name, data]) => ({ name, count: data.count, totalQty: data.totalQty }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const AuditLog = require('../../models/AuditLog');
    const lastAudit = await AuditLog.findOne().sort({ timestamp: -1 }).select('timestamp');
    let lastAuditAgo = 'Never';
    if (lastAudit) {
      const diffH = Math.floor((now - new Date(lastAudit.timestamp)) / (1000 * 60 * 60));
      lastAuditAgo = diffH < 1 ? 'Just now' : diffH < 24 ? `${diffH}h ago` : `${Math.floor(diffH / 24)}d ago`;
    }

    const withSds = await Chemical.countDocuments({ archived: false, sds_attached: true, ...labQuery });
    const auditScore = totalCount > 0 ? Math.round((withSds / totalCount) * 100) + '%' : 'N/A';

    const stats = {
      total: totalCount,
      flammables,
      hazardSummary,
      lowStock,
      auditScore,
      expirations,
      storageBreakdown,
      lastAuditAgo
    };
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getChemicals = async (req, res) => {
  try {
    const { 
      search, 
      hazard, 
      status, 
      building, 
      room, 
      cabinet, 
      shelf,
      expiryStatus,
      archived,
      page = 1, 
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const baseQuery = { archived: archived === 'true' };
    if (!(req.user.role === 'Admin' && !req.activeLabId)) {
      baseQuery.lab = req.activeLabId;
    }

    const hazardParam = hazard || req.query['hazard[]'];
    if (hazardParam) {
      const hazards = Array.isArray(hazardParam) ? hazardParam.filter(Boolean) : [hazardParam].filter(Boolean);
      if (hazards.length > 0) {
        baseQuery.ghs_classes = { $in: hazards };
      }
    }

    const statusParam = status || req.query['status[]'];
    if (statusParam) {
      const statuses = Array.isArray(statusParam) ? statusParam.filter(Boolean) : [statusParam].filter(Boolean);
      if (statuses.length > 0) {
        baseQuery.status = { $in: statuses };
      }
    }

    if (building) baseQuery.building = building;
    if (room) baseQuery.room = room;
    if (cabinet) baseQuery.cabinet = cabinet;
    if (shelf) baseQuery.shelf = shelf;
    if (expiryStatus) baseQuery.status = expiryStatus;

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, Math.min(5000, parseInt(limit) || 20));
    const skip = (p - 1) * l;

    const validSortFields = ['name', 'createdAt', 'expiry_date', 'quantity', 'status', 'id'];
    const sField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const defaultSort = { [sField]: sortOrder === 'desc' ? -1 : 1 };

    let chemicals = [];
    let total = 0;
    let searchMode = 'none';

    if (search && search.trim()) {
      const trimmed = search.trim();
      const escapedSearch = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      try {
        const fullTextQuery = { ...baseQuery, $text: { $search: trimmed } };
        const textResults = await Chemical.find(fullTextQuery).limit(l);
        if (textResults.length > 0) {
          chemicals = await Chemical
            .find(fullTextQuery, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(l);
          total = await Chemical.countDocuments(fullTextQuery);
          searchMode = 'fulltext';
          
          if (!chemicals.some(c => c.id.toLowerCase() === trimmed.toLowerCase())) {
             const exactIdChem = await Chemical.findOne({ ...baseQuery, id: trimmed.toUpperCase() });
             if (exactIdChem) {
                chemicals = [exactIdChem, ...chemicals.filter(c => c.id !== exactIdChem.id)].slice(0, l);
                total += 1;
             }
          }
        } else {
          throw new Error("No text results");
        }
      } catch (e) {
        const regexQuery = {
          ...baseQuery,
          $or: [
            { id: { $regex: escapedSearch, $options: 'i' } },
            { name: { $regex: escapedSearch, $options: 'i' } },
            { iupac_name: { $regex: escapedSearch, $options: 'i' } },
            { cas_number: { $regex: escapedSearch, $options: 'i' } },
            { formula: { $regex: escapedSearch, $options: 'i' } },
            { supplier: { $regex: escapedSearch, $options: 'i' } },
            { batch_number: { $regex: escapedSearch, $options: 'i' } },
            { location: { $regex: escapedSearch, $options: 'i' } },
            { remarks: { $regex: escapedSearch, $options: 'i' } }
          ]
        };
        chemicals = await Chemical.find(regexQuery).sort(defaultSort).skip(skip).limit(l);
        total = await Chemical.countDocuments(regexQuery);
        searchMode = 'regex';
      }
    } else {
      chemicals = await Chemical.find(baseQuery).sort(defaultSort).skip(skip).limit(l);
      total = await Chemical.countDocuments(baseQuery);
    }

    res.json({
      data: chemicals,
      total,
      page: p,
      totalPages: Math.ceil(total / l),
      searchMode
    });
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    res.status(500).json({ 
      error: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

exports.getChemical = async (req, res) => {
  try {
    const query = { id: req.params.id };
    
    if (!(req.user.role === 'Admin' && !req.activeLabId)) {
      query.lab = req.activeLabId;
    }
    
    const chemical = await Chemical.findOne(query);
    if (!chemical) return res.status(404).json({ error: 'Chemical not found or access denied' });
    res.json(chemical);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching chemical details' });
  }
};

exports.createChemical = async (req, res) => {
  const data = req.body;
  const casRegex = /^\d{2,7}-\d{2}-\d$/;
  if (data.cas && !casRegex.test(data.cas)) {
    return res.status(400).json({ error: 'Invalid CAS number format.' });
  }

  let parsedGhs = data.ghs_classes || data.ghs;
  if (typeof parsedGhs === 'string') {
    try { parsedGhs = JSON.parse(parsedGhs); } catch (e) { parsedGhs = []; }
  }

  try {
    let isUnique = false;
    const baseCount = await Chemical.countDocuments({});
    let attempt = baseCount + 1;
    let idValue = '';
    
    while (!isUnique) {
      idValue = `C${String(attempt).padStart(3, '0')}`;
      const existing = await Chemical.findOne({ id: idValue, lab: req.activeLabId });
      if (!existing) isUnique = true;
      else attempt++;
    }
    
    const sdsFile = req.files && req.files['sds_file'] ? req.files['sds_file'][0] : null;
    const disposalFile = req.files && req.files['disposal_file'] ? req.files['disposal_file'][0] : null;

    const hasSdsFile = !!sdsFile;
    const sdsFileName = hasSdsFile ? sdsFile.originalname : undefined;
    const sdsFileUrl = hasSdsFile ? `/api/uploads/${sdsFile.filename}` : undefined;
    
    const hasDisposalFile = !!disposalFile;
    const disposalFileName = hasDisposalFile ? disposalFile.originalname : undefined;
    const disposalFileUrl = hasDisposalFile ? `/api/uploads/${disposalFile.filename}` : undefined;
    
    const newChem = new Chemical({
      id: idValue,
      name: data.name,
      iupac_name: data.iupac_name || data.iupac,
      cas_number: data.cas_number || data.cas,
      formula: data.formula,
      quantity: Number(data.quantity) || 0,
      unit: data.unit,
      base_quantity: convertToBase(Number(data.quantity) || 0, data.unit),
      base_unit: getBaseUnit(data.unit),
      state: data.state,
      purity: data.purity,
      concentration: data.concentration,
      storage_temp: data.storage_temp || data.storageTemp,
      storage_humidity: data.storage_humidity || data.storageHumidity,
      supplier: data.supplier,
      batch_number: data.batch_number || data.batch,
      manufacturing_date: data.manufacturing_date || data.mfgDate,
      purchase_date: data.purchase_date || data.purchaseDate,
      expiry_date: data.expiry_date || data.expiry,
      num_containers: Number(data.num_containers || data.numContainers) || 1,
      quantity_per_container: Number(data.quantity_per_container || data.qtyPerContainer),
      container_type: data.container_type || data.containerType,
      container_id_series: data.container_id_series || data.containerId,
      barcode: data.barcode || undefined,
      building: data.building,
      room: data.room,
      cabinet: data.cabinet,
      shelf: data.shelf,
      remarks: data.remarks,
      chemical_family: data.chemical_family,
      spill_instructions: data.spill_instructions,
      emergency_instructions: data.emergency_instructions,
      exposure_risks: (() => { try { return typeof data.exposure_risks === 'string' ? JSON.parse(data.exposure_risks) : (data.exposure_risks || []); } catch(e) { return []; } })(),
      ghs_classes: parsedGhs || [],
      
      ghs_hazards: (() => { try { return typeof data.ghs_hazards === 'string' ? JSON.parse(data.ghs_hazards) : (data.ghs_hazards || {}); } catch(e) { return {}; } })(),
      nfpa_rating: (() => { try { return typeof data.nfpa_rating === 'string' ? JSON.parse(data.nfpa_rating) : (data.nfpa_rating || {}); } catch(e) { return {}; } })(),
      hazard_summary: (() => { try { return typeof data.hazard_summary === 'string' ? JSON.parse(data.hazard_summary) : (data.hazard_summary || {}); } catch(e) { return {}; } })(),
      ppe_requirements: (() => { try { return typeof data.ppe_requirements === 'string' ? JSON.parse(data.ppe_requirements) : (data.ppe_requirements || []); } catch(e) { return []; } })(),
      incompatibility: (() => { try { return typeof data.incompatibility === 'string' ? JSON.parse(data.incompatibility) : (data.incompatibility || []); } catch(e) { return []; } })(),
      emergency_response: (() => { try { return typeof data.emergency_response === 'string' ? JSON.parse(data.emergency_response) : (data.emergency_response || {}); } catch(e) { return {}; } })(),
      exposure_details: (() => { try { return typeof data.exposure_details === 'string' ? JSON.parse(data.exposure_details) : (data.exposure_details || {}); } catch(e) { return {}; } })(),
      restricted_access: data.restricted_access === 'true',
      training_required: data.training_required === 'true',

      sds_attached: hasSdsFile || data.sdsAttached === 'true',
      sds_file_name: sdsFileName,
      sds_file_url: sdsFileUrl,
      disposal_file_name: disposalFileName,
      disposal_file_url: disposalFileUrl,
      lab: req.activeLabId, // Stamp it with currently active lab
      location: data.building ? `${data.building}-${data.room || ''}-${data.cabinet || ''}-${data.shelf || ''}`.replace(/-+$/, '') : (data.location || 'Pending Assignment'),
      status: (() => {
        if (!data.expiry_date && !data.expiry) return 'In Stock';
        const exp = new Date(data.expiry_date || data.expiry);
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const diff = (exp - now) / (1000 * 60 * 60 * 24);
        if (diff < 0) return 'Expired';
        if (diff <= (parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30)) return 'Near Expiry';
        return 'In Stock';
      })()
    });

    await newChem.save();

    if (newChem.batch_number) {
      await syncBatch({
        ...newChem.toObject(),
        id: idValue,
        lab: req.activeLabId
      });
    }

    await syncContainers({
      ...newChem.toObject(),
      id: idValue,
      lab: req.activeLabId
    });

    await checkChemicalExpiry(newChem, req.user);
    
    await logAudit(req, {
      action: 'CREATE',
      targetType: 'chemical',
      targetId: newChem.id,
      targetName: newChem.name,
      details: `Added new chemical: ${newChem.name} (${newChem.id})`
    });

    const highHazards = ['Explosive', 'Flammable', 'Toxic', 'Corrosive', 'Oxidizer'];
    if (newChem.ghs_classes?.some(h => highHazards.includes(h))) {
      const { notifyHazardWarning, notifyMissingSDS, notifyIncompatibility } = require('../../services/notificationService');
      await notifyHazardWarning(newChem, 'registered', req.user, req.activeLabId);

      // Missing SDS alert
      if (!hasSdsFile) {
        await notifyMissingSDS(newChem, req.activeLabId, req.user);
      }

      // Incompatibility check against co-located chemicals
      if (newChem.location && newChem.chemical_family) {
        const collocated = await Chemical.find({ location: newChem.location, id: { $ne: newChem.id }, archived: false });
        const incompatiblePairs = [['Acid','Base'],['Flammable','Oxidizer'],['Acid','Oxidizer'],['Base','Oxidizer']];
        for (const co of collocated) {
          if (!co.chemical_family) continue;
          for (const pair of incompatiblePairs) {
            if (pair.includes(newChem.chemical_family) && pair.includes(co.chemical_family) && newChem.chemical_family !== co.chemical_family) {
              await notifyIncompatibility(newChem, `${co.chemical_family} chemical at ${newChem.location}`, req.activeLabId, req.user);
              break;
            }
          }
        }
      }
    } else {
      const { notifyMissingSDS } = require('../../services/notificationService');
      if (!hasSdsFile && newChem.ghs_classes?.length > 0) {
        await notifyMissingSDS(newChem, req.activeLabId, req.user);
      }
    }

    let safety_warnings = [];
    if (newChem.location && newChem.chemical_family) {
      const collocated = await Chemical.find({ location: newChem.location, id: { $ne: newChem.id }, archived: false });
      const familiesInLocation = [...new Set(collocated.map(c => c.chemical_family).filter(Boolean))];
      
      const incompatiblePairs = [
        ['Acid', 'Base'],
        ['Flammable', 'Oxidizer'],
        ['Acid', 'Oxidizer'],
        ['Base', 'Oxidizer']
      ];

      for (let f of familiesInLocation) {
        for (let pair of incompatiblePairs) {
          if ((pair.includes(newChem.chemical_family) && pair.includes(f)) && newChem.chemical_family !== f) {
            safety_warnings.push(`⚠️ WARNING: Critical Incompatibility Detected. You have stored a(n) ${newChem.chemical_family} in the exact same location (${newChem.location}) as a(n) ${f}.`);
          }
        }
      }
    }

    res.status(201).json({ ...newChem.toJSON(), safety_warnings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateChemical = async (req, res) => {
  const id = req.params.id; 
  const data = req.body;
  const casRegex = /^\d{2,7}-\d{2}-\d$/;
  if (data.cas && !casRegex.test(data.cas)) {
    return res.status(400).json({ error: 'Invalid CAS number format.' });
  }

  let parsedGhs = data.ghs_classes || data.ghs;
  if (typeof parsedGhs === 'string') {
    try { parsedGhs = JSON.parse(parsedGhs); } catch (e) { parsedGhs = []; }
  }

  try {
    const chemical = await Chemical.findOne({ id: id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    const oldName = chemical.name;
    chemical.name = data.name;
    chemical.iupac_name = data.iupac_name || data.iupac;
    chemical.cas_number = data.cas_number || data.cas;
    chemical.formula = data.formula;
    chemical.quantity = Number(data.quantity) || 0;
    chemical.unit = data.unit;
    chemical.base_quantity = convertToBase(chemical.quantity, chemical.unit);
    chemical.base_unit = getBaseUnit(chemical.unit);
    chemical.state = data.state;
    chemical.purity = data.purity;
    chemical.concentration = data.concentration;
    chemical.storage_temp = data.storage_temp || data.storageTemp;
    chemical.storage_humidity = data.storage_humidity || data.storageHumidity;
    chemical.supplier = data.supplier;
    chemical.batch_number = data.batch_number || data.batch;
    chemical.manufacturing_date = data.manufacturing_date || data.mfgDate;
    chemical.purchase_date = data.purchase_date || data.purchaseDate;
    chemical.expiry_date = data.expiry_date || data.expiry;
    chemical.num_containers = Number(data.num_containers || data.numContainers) || 1;
    chemical.quantity_per_container = Number(data.quantity_per_container || data.qtyPerContainer);
    chemical.container_type = data.container_type || data.containerType;
    chemical.container_id_series = data.container_id_series || data.containerId;
    chemical.barcode = data.barcode || chemical.barcode;
    chemical.building = data.building;
    chemical.room = data.room;
    chemical.cabinet = data.cabinet;
    chemical.shelf = data.shelf;
    chemical.remarks = data.remarks;
    chemical.chemical_family = data.chemical_family;
    chemical.spill_instructions = data.spill_instructions;
    chemical.emergency_instructions = data.emergency_instructions;
    chemical.exposure_risks = (() => { try { return typeof data.exposure_risks === 'string' ? JSON.parse(data.exposure_risks) : (data.exposure_risks || []); } catch(e) { return []; } })();
    chemical.location = data.building ? `${data.building}-${data.room || ''}-${data.cabinet || ''}-${data.shelf || ''}`.replace(/-+$/, '') : (data.location || chemical.location);
    chemical.ghs_classes = parsedGhs || [];
    
    if (data.ghs_hazards) chemical.ghs_hazards = typeof data.ghs_hazards === 'string' ? JSON.parse(data.ghs_hazards) : data.ghs_hazards;
    if (data.nfpa_rating) chemical.nfpa_rating = typeof data.nfpa_rating === 'string' ? JSON.parse(data.nfpa_rating) : data.nfpa_rating;
    if (data.hazard_summary) chemical.hazard_summary = typeof data.hazard_summary === 'string' ? JSON.parse(data.hazard_summary) : data.hazard_summary;
    if (data.ppe_requirements) chemical.ppe_requirements = typeof data.ppe_requirements === 'string' ? JSON.parse(data.ppe_requirements) : data.ppe_requirements;
    if (data.incompatibility) chemical.incompatibility = typeof data.incompatibility === 'string' ? JSON.parse(data.incompatibility) : data.incompatibility;
    if (data.emergency_response) chemical.emergency_response = typeof data.emergency_response === 'string' ? JSON.parse(data.emergency_response) : data.emergency_response;
    if (data.exposure_details) chemical.exposure_details = typeof data.exposure_details === 'string' ? JSON.parse(data.exposure_details) : data.exposure_details;
    if (data.restricted_access !== undefined) chemical.restricted_access = data.restricted_access === 'true' || data.restricted_access === true;
    if (data.training_required !== undefined) chemical.training_required = data.training_required === 'true' || data.training_required === true;
    
    const sdsFile = req.files && req.files['sds_file'] ? req.files['sds_file'][0] : null;
    const disposalFile = req.files && req.files['disposal_file'] ? req.files['disposal_file'][0] : null;

    if (sdsFile) {
      chemical.sds_attached = true;
      chemical.sds_file_name = sdsFile.originalname;
      chemical.sds_file_url = `/api/uploads/${sdsFile.filename}`;
    } else {
      chemical.sds_attached = data.sds_attached === 'true' || chemical.sds_attached;
    }

    if (disposalFile) {
      chemical.disposal_file_name = disposalFile.originalname;
      chemical.disposal_file_url = `/api/uploads/${disposalFile.filename}`;
    }

    await chemical.save();

    if (chemical.batch_number) {
      await syncBatch({
        ...chemical.toObject(),
        id: chemical.id,
        lab: chemical.lab || req.activeLabId
      });
    }

    await syncContainers({
      ...chemical.toObject(),
      id: chemical.id,
      lab: chemical.lab || req.activeLabId
    });

    const expiryToUse = data.expiry_date || data.expiry;
    if (expiryToUse) {
      const thresholdDays = parseInt(process.env.NEAR_EXPIRY_THRESHOLD) || 30;
      const exp = new Date(expiryToUse);
      const now = new Date();
      const diff = (exp - now) / (1000 * 60 * 60 * 24);
      let newExpStatus = null;
      if (diff < 0) newExpStatus = 'Expired';
      else if (diff <= thresholdDays) newExpStatus = 'Near Expiry';

      const Batch = require('../../models/Batch');
      const batches = await Batch.find({ chemical_id: chemical.id });
      for (let b of batches) {
         b.expiry_date = expiryToUse;
         if (newExpStatus) b.status = newExpStatus;
         else if (['Near Expiry', 'Expired'].includes(b.status)) b.status = 'Active';
         await b.save();
      }

      const Container = require('../../models/Container');
      const containers = await Container.find({ chemical_id: chemical.id });
      for (let c of containers) {
         c.expiry_date = expiryToUse;
         if (!['Empty', 'Damaged'].includes(c.status)) {
            if (newExpStatus) c.status = newExpStatus;
            else if (['Near Expiry', 'Expired'].includes(c.status)) c.status = 'Full';
         }
         await c.save();
      }
    }
    
    await checkChemicalExpiry(chemical, req.user);

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Updated chemical information for ${oldName} (${chemical.id})`
    });

    // Safety Officer: Incompatibility notification
    const { notifyIncompatibility, notifyUnsafeStorage } = require('../../services/notificationService');
    let safety_warnings = [];
    if (chemical.location && chemical.chemical_family) {
      const collocated = await Chemical.find({ location: chemical.location, id: { $ne: chemical.id }, archived: false });
      const familiesInLocation = [...new Set(collocated.map(c => c.chemical_family).filter(Boolean))];
      
      const incompatiblePairs = [
        ['Acid', 'Base'],
        ['Flammable', 'Oxidizer'],
        ['Acid', 'Oxidizer'],
        ['Base', 'Oxidizer']
      ];

      for (let f of familiesInLocation) {
        for (let pair of incompatiblePairs) {
          if ((pair.includes(chemical.chemical_family) && pair.includes(f)) && chemical.chemical_family !== f) {
            safety_warnings.push(`⚠️ WARNING: Critical Incompatibility Detected. You have stored a(n) ${chemical.chemical_family} in the exact same location (${chemical.location}) as a(n) ${f}.`);
            // Fire incompatibility notification
            await notifyIncompatibility(chemical, `${f} chemical at ${chemical.location}`, chemical.lab || req.activeLabId, req.user);
          }
        }
      }

      // Unsafe storage: check temperature/humidity against known rules
      if (chemical.storage_temp) {
        const tempStr = String(chemical.storage_temp).toLowerCase();
        if (tempStr.includes('room') && chemical.ghs_classes?.includes('Flammable')) {
          safety_warnings.push(`⚠️ Storage Condition: ${chemical.name} is flammable and stored at room temperature. Verify flammable cabinet compliance.`);
          await notifyUnsafeStorage(chemical, 'Flammable chemical stored at room temperature without verified flammable cabinet', chemical.lab || req.activeLabId, req.user);
        }
      }
    }

    res.json({ message: 'Updated successfully', chemical, safety_warnings });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.archiveChemical = async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    chemical.archived = true;
    chemical.status = 'Archived';
    await chemical.save();

    await logAudit(req, {
      action: 'DELETE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Archived (soft deleted) chemical: ${chemical.name} (${chemical.id})`
    });

    res.json({ message: 'Archived successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.restoreChemical = async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });

    chemical.archived = false;
    chemical.status = 'In Stock';
    await chemical.save();

    await logAudit(req, {
      action: 'UPDATE',
      targetType: 'chemical',
      targetId: chemical.id,
      targetName: chemical.name,
      details: `Restored chemical from archive: ${chemical.name} (${chemical.id})`
    });

    res.json({ message: 'Restored successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getQRCode = async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    const qrData = chemical.id;
    const qrImage = await QRCode.toDataURL(qrData);
    
    res.json({ qrCode: qrImage });
  } catch (err) {
    res.status(500).json({ error: 'QR Generation failed' });
  }
};

exports.getLabelData = async (req, res) => {
  try {
    const chemical = await Chemical.findOne({ id: req.params.id });
    if (!chemical) return res.status(404).json({ error: 'Chemical not found' });
    
    const qrData = await QRCode.toDataURL(chemical.id);
    
    const labelData = {
      name: chemical.name,
      id: chemical.id,
      cas_number: chemical.cas_number,
      formula: chemical.formula,
      ghs_hazards: chemical.ghs_hazards || { signal_word: 'None', h_codes: [], p_codes: [], pictograms: [] },
      ghs_classes: chemical.ghs_classes || [],
      nfpa_rating: chemical.nfpa_rating || { health: 0, flammability: 0, reactivity: 0, special: '' },
      ppe_requirements: chemical.ppe_requirements || [],
      qrCode: qrData,
      location: chemical.location,
      expiry_date: chemical.expiry_date,
      status: chemical.status
    };
    
    res.json(labelData);
  } catch (err) {
    res.status(500).json({ error: 'Label data generation failed' });
  }
};

