const cron = require('node-cron');
const mongoose = require('mongoose');

/**
 * Daily MongoDB keep-alive — read-only ping only.
 * Does not insert, update, delete, or modify any documents.
 * Keeps the Atlas / driver connection from going fully idle.
 */
const runDbKeepAlive = async () => {
  const at = new Date().toISOString();
  console.log(`[DbKeepAlive] Daily ping started at ${at}`);

  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      console.warn('[DbKeepAlive] Skipped — MongoDB is not connected.');
      return { ok: false, reason: 'not_connected' };
    }

    // Server command only — does not touch collection data
    const result = await mongoose.connection.db.admin().command({ ping: 1 });
    const ok = result?.ok === 1;

    console.log(
      ok
        ? '[DbKeepAlive] Success — MongoDB responded to ping (no data changed).'
        : '[DbKeepAlive] Unexpected ping response:',
      result
    );
    return { ok, at };
  } catch (err) {
    console.error('[DbKeepAlive] Ping failed:', err.message || err);
    return { ok: false, error: err.message || String(err), at };
  }
};

/**
 * Runs once per day at 03:00 server time.
 */
const initDbKeepAliveSchedule = () => {
  cron.schedule('0 3 * * *', () => {
    void runDbKeepAlive();
  });
  console.log('[DbKeepAlive] Scheduled daily at 03:00 (read-only ping)');
};

module.exports = {
  initDbKeepAliveSchedule,
  runDbKeepAlive,
};
