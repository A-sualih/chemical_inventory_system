const fs = require('fs');

const filesToFix = [
  'src/features/transfers/TransferDashboard.jsx',
  'src/features/procurement/SuppliersTab.jsx',
  'src/features/procurement/PurchaseOrdersTab.jsx',
  'src/features/procurement/OrderTrackingTab.jsx',
  'src/features/procurement/VendorPerformanceTab.jsx',
  'src/features/waste/DisposalLogTab.jsx',
  'src/features/settings/LabManagement.jsx',
  'src/features/batches/ExpiryTracker.jsx',
  'src/features/requests/Requests.jsx',
  'src/features/chemicals/ChemicalForm.jsx',
  'src/features/inventory/StockActionModal.jsx'
];

filesToFix.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  let imports = [];

  const replaceExact = (from, to, lucide) => {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      if (!imports.includes(lucide)) imports.push(lucide);
    }
  };

  // TransferDashboard
  replaceExact('>📤 ', '><UploadCloud className="w-5 h-5 inline-block mr-2" /> ', 'UploadCloud');
  replaceExact('>📥 ', '><DownloadCloud className="w-5 h-5 inline-block mr-2" /> ', 'DownloadCloud');
  replaceExact('>✕<', '><X className="w-4 h-4 inline-block" /><', 'X');
  
  // Suppliers / POs / Vendor
  replaceExact(`'✕'`, `<X className="w-4 h-4 inline-block" />`, 'X');
  replaceExact(`'✓'`, `<Check className="w-4 h-4 inline-block" />`, 'Check');
  replaceExact(`>★<`, `><Star className="w-4 h-4 inline-block" /><`, 'Star');
  replaceExact(`>📋<`, `><ClipboardList className="w-8 h-8 inline-block" /><`, 'ClipboardList');
  
  replaceExact(`'✓ Delivered On Time'`, `<><Check className="w-4 h-4 inline-block mr-1" /> Delivered On Time</>`, 'Check');
  replaceExact(`'⚠ Damaged Goods'`, `<><AlertTriangle className="w-4 h-4 inline-block mr-1" /> Damaged Goods</>`, 'AlertTriangle');
  replaceExact(`'⚠ Qty Mismatch'`, `<><AlertTriangle className="w-4 h-4 inline-block mr-1" /> Qty Mismatch</>`, 'AlertTriangle');
  replaceExact(`'✕ Rejected'`, `<><X className="w-4 h-4 inline-block mr-1" /> Rejected</>`, 'X');

  // Logs / Tracker / LabManagement
  replaceExact(`>⚠️ Shipment Delayed<`, `><AlertTriangle className="w-5 h-5 inline-block mr-2" /> Shipment Delayed<`, 'AlertTriangle');
  replaceExact(`>⚠️ CRITICAL WARNING: CASCADING DELETION<`, `><AlertTriangle className="w-6 h-6 inline-block mr-2 text-red-500" /> CRITICAL WARNING: CASCADING DELETION<`, 'AlertTriangle');
  replaceExact(`'(🔥 EXPIRED)'`, `<><Flame className="w-4 h-4 inline-block mr-1 text-red-500" /> EXPIRED</>`, 'Flame');
  
  // Requests
  replaceExact(`>🔵 FIFO auto-selected<`, `><CircleDot className="w-4 h-4 inline-block mr-1" /> FIFO auto-selected<`, 'CircleDot');
  replaceExact(`'🔵 [FIFO] '`, `<><CircleDot className="w-4 h-4 inline-block mr-1 text-blue-500" /> [FIFO] </>`, 'CircleDot');
  replaceExact(`>⚠️<`, `><AlertTriangle className="w-6 h-6 inline-block" /><`, 'AlertTriangle');
  replaceExact(`>🔵<`, `><CircleDot className="w-6 h-6 inline-block" /><`, 'CircleDot');
  replaceExact(`>⚠️ No active containers`, `><AlertTriangle className="w-4 h-4 inline-block mr-1 text-amber-500" /> No active containers`, 'AlertTriangle');
  replaceExact(`>🚫<`, `><Ban className="w-4 h-4 inline-block mr-1 text-red-500" /><`, 'Ban');
  
  // ChemicalForm / Modal
  replaceExact(`📷 Point camera`, `<Camera className="w-4 h-4 inline-block mr-2" /> Point camera`, 'Camera');
  replaceExact(`>⚠ `, `><AlertTriangle className="w-4 h-4 inline-block mr-1 text-amber-500" /> `, 'AlertTriangle');

  if (imports.length > 0 && content !== original) {
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/;
    const m = content.match(importRegex);
    if (m) {
      let ext = m[1].split(',').map(x=>x.trim());
      imports.forEach(i => { if(!ext.includes(i)) ext.push(i); });
      content = content.replace(m[0], `import { ${ext.join(', ')} } from 'lucide-react';`);
    } else {
      let rIdx = content.indexOf('import ');
      if (rIdx >= 0) {
        content = content.substring(0, rIdx) + `import { ${imports.join(', ')} } from 'lucide-react';\n` + content.substring(rIdx);
      }
    }
  }

  fs.writeFileSync(f, content);
});

console.log("Emoji replacement complete.");

