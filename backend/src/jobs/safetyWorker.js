const cron = require('node-cron');
const Chemical = require('../models/Chemical');
const {
  notifyMissingSDS,
  notifyIncompatibility,
  notifyUnsafeStorage,
  notifyEnvironmentalRisk
} = require('../services/notificationService');

/**
 * Checks all active chemicals for:
 * - Missing SDS documents (hazardous chemicals without SDS attached)
 * - Storage incompatibilities (incompatible chemical families in same location)
 * - Unsafe storage conditions (e.g. flammable at room temp)
 * - Environmental risks (toxic/explosive chemicals without disposal notes)
 *
 * Runs once on startup, then every day at 07:00.
 */
const runSafetyCheck = async () => {
  console.log(`[SafetyWorker] Starting daily safety scan at ${new Date().toISOString()}`);
  let alertCount = 0;

  try {
    const chemicals = await Chemical.find({ archived: false });

    // Build a location → [chemicals] map for incompatibility checks
    const locationMap = {};
    for (const chem of chemicals) {
      if (!chem.location || chem.location === 'Pending Assignment') continue;
      if (!locationMap[chem.location]) locationMap[chem.location] = [];
      locationMap[chem.location].push(chem);
    }

    const incompatiblePairs = [
      ['Acid', 'Base'],
      ['Flammable', 'Oxidizer'],
      ['Acid', 'Oxidizer'],
      ['Base', 'Oxidizer'],
    ];

    // Track already-alerted pairs to avoid duplicates within a single scan
    const alertedPairs = new Set();
    const alertedMissingSDS = new Set();
    const alertedUnsafeStorage = new Set();
    const alertedEnvRisk = new Set();

    for (const chemical of chemicals) {
      const labId = chemical.lab;

      // ── 1. Missing SDS ──────────────────────────────────────────────────────
      const isHazardous = chemical.ghs_classes && chemical.ghs_classes.length > 0;
      if (isHazardous && !chemical.sds_attached && !alertedMissingSDS.has(String(chemical._id))) {
        await notifyMissingSDS(chemical, labId);
        alertedMissingSDS.add(String(chemical._id));
        alertCount++;
      }

      // ── 2. Storage Incompatibilities ─────────────────────────────────────────
      if (chemical.chemical_family && chemical.location && locationMap[chemical.location]) {
        const coLocated = locationMap[chemical.location].filter(c => String(c._id) !== String(chemical._id));

        for (const co of coLocated) {
          if (!co.chemical_family) continue;
          for (const pair of incompatiblePairs) {
            if (
              pair.includes(chemical.chemical_family) &&
              pair.includes(co.chemical_family) &&
              chemical.chemical_family !== co.chemical_family
            ) {
              const pairKey = [String(chemical._id), String(co._id)].sort().join('-');
              if (!alertedPairs.has(pairKey)) {
                await notifyIncompatibility(
                  chemical,
                  `${co.chemical_family} chemical (${co.name}) at ${chemical.location}`,
                  labId
                );
                alertedPairs.add(pairKey);
                alertCount++;
              }
            }
          }
        }
      }

      // ── 3. Unsafe Storage Conditions ─────────────────────────────────────────
      if (
        chemical.storage_temp &&
        chemical.ghs_classes?.includes('Flammable') &&
        !alertedUnsafeStorage.has(String(chemical._id))
      ) {
        const tempStr = String(chemical.storage_temp).toLowerCase();
        if (tempStr.includes('room') || tempStr.includes('ambient') || tempStr.includes('25')) {
          await notifyUnsafeStorage(
            chemical,
            'Flammable chemical stored at room temperature — verify flammable cabinet compliance.',
            labId
          );
          alertedUnsafeStorage.add(String(chemical._id));
          alertCount++;
        }
      }

      // ── 4. Environmental Risk (Toxic/Explosive with no disposal guidance) ────
      const isEnvRisk =
        chemical.hazard_summary?.hazard_class === 'Toxic' ||
        chemical.hazard_summary?.hazard_class === 'Explosive' ||
        chemical.ghs_classes?.includes('Toxic') ||
        chemical.ghs_classes?.includes('Explosive');

      if (
        isEnvRisk &&
        !chemical.disposal_file_url &&
        !chemical.emergency_instructions &&
        !alertedEnvRisk.has(String(chemical._id))
      ) {
        await notifyEnvironmentalRisk(
          chemical,
          `${chemical.hazard_summary?.hazard_class || 'Hazardous'} chemical has no disposal guidance or emergency instructions on file.`,
          labId
        );
        alertedEnvRisk.add(String(chemical._id));
        alertCount++;
      }
    }

    console.log(`[SafetyWorker] Completed. Fired ${alertCount} safety alert(s).`);
  } catch (err) {
    console.error('[SafetyWorker] Error during execution:', err);
  }
};

/**
 * Initializes the cron job — runs every day at 07:00.
 */
const initSafetySchedule = () => {
  cron.schedule('0 7 * * *', () => {
    runSafetyCheck();
  });

  console.log('[SafetyWorker] Daily safety check scheduler initialized (runs at 07:00).');
};

module.exports = { runSafetyCheck, initSafetySchedule };

