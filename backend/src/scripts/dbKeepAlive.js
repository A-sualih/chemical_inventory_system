#!/usr/bin/env node

/**
 * MongoDB Atlas Keep-Alive (standalone — for OS crontab if the API is not always running)
 *
 * Read-only ping only. Does not insert, update, delete, or change any data.
 *
 * Usage:
 *   npm run keepalive
 *
 * Linux cron (once daily at midnight):
 *   0 0 * * * cd /path/to/backend && /usr/bin/node src/scripts/dbKeepAlive.js >> keepalive.log 2>&1
 *
 * Or hit the live API once daily:
 *   curl -s https://your-api/api/public/keep-alive
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('[DB Keep-Alive] Error: MONGODB_URI is not defined.');
  process.exit(1);
}

async function runKeepAlive() {
  console.log(`[DB Keep-Alive] Started at ${new Date().toISOString()}`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('[DB Keep-Alive] Connected.');

    const result = await mongoose.connection.db.admin().command({ ping: 1 });
    if (result?.ok === 1) {
      console.log('[DB Keep-Alive] Success — ping ok (no data changed).');
    } else {
      console.warn('[DB Keep-Alive] Unexpected response:', result);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('[DB Keep-Alive] Failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    console.log('[DB Keep-Alive] Disconnected. Done.');
  }
}

runKeepAlive();
