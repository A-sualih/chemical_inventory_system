const fs = require('fs');

let content = fs.readFileSync('src/controllers/waste/wasteController.js', 'utf8');

// Inject req.activeLabId logic where appropriate
content = content.replace(/const disposal = new WasteDisposal\(\{/g, 'const disposal = new WasteDisposal({\n      lab: req.activeLabId,');
content = content.replace(/const permit = await WastePermit\.findOne\(\{ status: 'Active'/g, 'const labQuery = req.activeLabId ? { lab: req.activeLabId } : {};\n    const permit = await WastePermit.findOne({ status: \'Active\', ...labQuery');
content = content.replace(/await Notification\.create\(\{/g, 'await Notification.create({ lab: req.activeLabId, ');
content = content.replace(/const batch = await Batch\.findById\(cleanedBatchId\);/g, 'const batch = await Batch.findOne({ _id: cleanedBatchId, ...labQuery });');
content = content.replace(/await InventoryLog\.create\(\{/g, 'await InventoryLog.create({ lab: req.activeLabId, ');
content = content.replace(/const targetBatch = await Batch\.findById\(cleanedBatchId\);/g, 'const targetBatch = await Batch.findOne({ _id: cleanedBatchId, ...labQuery });');
content = content.replace(/WasteDisposal\.findById\(id\)/g, 'WasteDisposal.findOne({ _id: id, ...(req.activeLabId && { lab: req.activeLabId }) })');
content = content.replace(/WasteCompliance\.findById\(id\)/g, 'WasteCompliance.findOne({ _id: id, ...(req.activeLabId && { lab: req.activeLabId }) })');
content = content.replace(/WasteDisposal\.find\(query\)/g, 'WasteDisposal.find({ ...query, ...(req.activeLabId && { lab: req.activeLabId }) })');
content = content.replace(/WasteDisposal\.countDocuments\(query\)/g, 'WasteDisposal.countDocuments({ ...query, ...(req.activeLabId && { lab: req.activeLabId }) })');
content = content.replace(/WasteCompliance\.find\(\)/g, 'WasteCompliance.find(req.activeLabId ? { lab: req.activeLabId } : {})');
content = content.replace(/WasteSafetyIncident\.find\(\)/g, 'WasteSafetyIncident.find(req.activeLabId ? { lab: req.activeLabId } : {})');
content = content.replace(/WastePermit\.find\(\)/g, 'WastePermit.find(req.activeLabId ? { lab: req.activeLabId } : {})');
content = content.replace(/WasteDisposal\.aggregate\(\[/g, 'WasteDisposal.aggregate([ { $match: req.activeLabId ? { lab: req.activeLabId } : {} }, ');
content = content.replace(/WasteSafetyIncident\.aggregate\(\[/g, 'WasteSafetyIncident.aggregate([ { $match: req.activeLabId ? { lab: req.activeLabId } : {} }, ');

fs.writeFileSync('src/controllers/waste/wasteController.js', content, 'utf8');

