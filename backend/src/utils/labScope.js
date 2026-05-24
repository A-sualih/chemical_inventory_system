const mongoose = require('mongoose');
const Lab = require('../models/Lab');

/**
 * Mongo filter for the caller's active lab.
 * Admin with no active lab → {} (global). Otherwise → { lab: activeLabId }.
 */
function labFilter(req) {
  if (req.user?.role === 'Admin' && !req.activeLabId) return {};
  if (!req.activeLabId) return { lab: '__no_lab__' }; // never matches a real ObjectId
  return { lab: req.activeLabId };
}

/** Merge an arbitrary query with the caller's lab filter. */
function withLab(req, query = {}) {
  return { ...query, ...labFilter(req) };
}

/**
 * Cross-lab browse (transfers / requisitions): target lab must exist,
 * and the caller must already be scoped to an active lab.
 */
async function assertBrowsableLab(req, labId) {
  if (!labId || !mongoose.Types.ObjectId.isValid(labId)) {
    const err = new Error('Invalid laboratory id');
    err.status = 400;
    throw err;
  }

  if (req.user?.role === 'Admin' && !req.activeLabId) {
    const lab = await Lab.findById(labId).select('_id').lean();
    if (!lab) {
      const err = new Error('Laboratory not found');
      err.status = 404;
      throw err;
    }
    return labId;
  }

  if (!req.activeLabId) {
    const err = new Error('Active laboratory required');
    err.status = 403;
    throw err;
  }

  if (String(labId) === String(req.activeLabId)) {
    return labId;
  }

  const lab = await Lab.findById(labId).select('_id').lean();
  if (!lab) {
    const err = new Error('Laboratory not found');
    err.status = 404;
    throw err;
  }

  return labId;
}

module.exports = { labFilter, withLab, assertBrowsableLab };
