/**
 * test_incompatibility.js
 * Seeds two chemically incompatible chemicals into the same location
 * then calls the incompatibility check logic directly to verify detection.
 * 
 * Run with: node scratch/test_incompatibility.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Chemical = require('../src/models/Chemical');

const TEST_LOCATION = 'TEST_STORAGE_UNIT_99';

const incompatiblePairs = [
  ['Acid', 'Base'],
  ['Flammable', 'Oxidizer'],
  ['Acid', 'Oxidizer'],
  ['Base', 'Oxidizer'],
  ['Water-Reactive', 'Moisture'],
];

function checkIncompatibility(chemicals) {
  const conflicts = [];
  for (let i = 0; i < chemicals.length; i++) {
    for (let j = i + 1; j < chemicals.length; j++) {
      const c1 = chemicals[i];
      const c2 = chemicals[j];
      for (const pair of incompatiblePairs) {
        if (pair.includes(c1.chemical_family) && pair.includes(c2.chemical_family) && c1.chemical_family !== c2.chemical_family) {
          conflicts.push({
            chemicals: [c1.name, c2.name],
            reason: `Incompatible families: ${c1.chemical_family} and ${c2.chemical_family}`,
            severity: 'High',
          });
        }
      }
      if (c1.incompatibility?.includes(c2.name) || c1.incompatibility?.includes(c2.chemical_family)) {
        conflicts.push({
          chemicals: [c1.name, c2.name],
          reason: `${c1.name} is explicitly incompatible with ${c2.name}/${c2.chemical_family}`,
          severity: 'Critical',
        });
      }
    }
  }
  return conflicts;
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chemical_inventory';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB\n');

  // Clean up any previous test data
  await Chemical.deleteMany({ location: TEST_LOCATION });

  // --- Seed Test Pair 1: Acid + Base (should conflict) ---
  const acid = await Chemical.create({
    id: 'TEST-ACID-01',
    name: 'Test Hydrochloric Acid',
    chemical_family: 'Acid',
    location: TEST_LOCATION,
    quantity: 1,
    unit: 'L',
    status: 'In Stock',
    archived: false,
  });

  const base = await Chemical.create({
    id: 'TEST-BASE-01',
    name: 'Test Sodium Hydroxide',
    chemical_family: 'Base',
    location: TEST_LOCATION,
    quantity: 1,
    unit: 'kg',
    status: 'In Stock',
    archived: false,
  });

  console.log(`Seeded: "${acid.name}" (${acid.chemical_family}) + "${base.name}" (${base.chemical_family})`);
  console.log(`Location: ${TEST_LOCATION}\n`);

  // --- Run the detection ---
  const chemicals = await Chemical.find({ location: TEST_LOCATION, archived: false });
  const conflicts = checkIncompatibility(chemicals);

  if (conflicts.length > 0) {
    console.log(`🚨 DETECTION RESULT: ${conflicts.length} conflict(s) found!\n`);
    conflicts.forEach((c, i) => {
      console.log(`  Conflict ${i + 1}:`);
      console.log(`    Chemicals : ${c.chemicals.join(' + ')}`);
      console.log(`    Reason    : ${c.reason}`);
      console.log(`    Severity  : ${c.severity}`);
    });
  } else {
    console.log('✅ No conflicts detected (check chemical_family values are set correctly).');
  }

  // --- Cleanup ---
  await Chemical.deleteMany({ location: TEST_LOCATION });
  console.log('\n🧹 Test chemicals cleaned up.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Script error:', err.message);
  process.exit(1);
});

