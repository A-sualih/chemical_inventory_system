const fs = require('fs');

let content = fs.readFileSync('src/controllers/inventory/inventoryController.js', 'utf8');

// Inject req.activeLabId logic
content = content.replace(/const chemicals = await Chemical\.find\(\);/g, 'const chemicals = await Chemical.find(req.activeLabId ? { lab: req.activeLabId } : {});');

content = content.replace(/const count = await Chemical\.countDocuments\(\);/g, 'const count = await Chemical.countDocuments(req.activeLabId ? { lab: req.activeLabId } : {});');
content = content.replace(/const chemical = new Chemical\(\{/g, 'const chemical = new Chemical({\n      lab: req.activeLabId,');

content = content.replace(/const chemical = await Chemical\.findOneAndUpdate\(/g, 'const chemical = await Chemical.findOneAndUpdate(\n      { id: req.params.id, ...(req.activeLabId && { lab: req.activeLabId }) },');
content = content.replace(/\{ id: req\.params\.id \},\n\s+\{ \$set: req\.body \},/g, '{ $set: req.body },');

content = content.replace(/const chem = await Chemical\.findOne\(\{ id: chemical_id \}\);/g, 'const chem = await Chemical.findOne({ id: chemical_id, ...(req.activeLabId && { lab: req.activeLabId }) });');

content = content.replace(/const logs = await InventoryLog\.find\(\)/g, 'const logs = await InventoryLog.find(req.activeLabId ? { lab: req.activeLabId } : {})');
content = content.replace(/const logs = await InventoryLog\.find\(\{ chemical_id: req\.params\.id \}\)/g, 'const logs = await InventoryLog.find({ chemical_id: req.params.id, ...(req.activeLabId && { lab: req.activeLabId }) })');

content = content.replace(/const log = new InventoryLog\(\{/g, 'const log = new InventoryLog({ lab: req.activeLabId, ');

fs.writeFileSync('src/controllers/inventory/inventoryController.js', content, 'utf8');

