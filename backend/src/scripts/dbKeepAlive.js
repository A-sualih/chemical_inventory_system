#!/usr/bin/env node

/**
 * MongoDB Atlas Background Keep-Alive Script
 * 
 * Purpose: Connects directly to MongoDB Atlas and fetches a single document 
 *          to prevent the database cluster/connections from becoming idle or paused.
 *          Does not insert/update/delete data or return data to users.
 * 
 * Dependencies: mongodb, dotenv
 * 
 * Instructions for Linux cron scheduling:
 * 1. Open your crontab configuration:
 *    crontab -e
 * 
 * 2. Add the following entry to run the script once daily (e.g., at midnight):
 *    0 0 * * * /usr/bin/node /home/abushe/abushe/chemical_inventory_system/backend/src/scripts/dbKeepAlive.js >> /home/abushe/abushe/chemical_inventory_system/backend/src/scripts/keepalive.log 2>&1
 * 
 * 3. Make sure node path is correct (/usr/bin/node or output of `which node`).
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('[DB Keep-Alive] Error: MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

async function runKeepAlive() {
  console.log(`[DB Keep-Alive] Started execution at ${new Date().toISOString()}`);

  // Mask credentials in output
  let safeUri = uri;
  try {
    const parsed = new URL(uri);
    parsed.password = '****';
    safeUri = parsed.toString();
  } catch (e) {
    if (uri.includes('@')) {
      safeUri = 'mongodb+srv://****:****@' + uri.split('@')[1];
    }
  }

  // Connect client directly to the cluster
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  try {
    console.log(`[DB Keep-Alive] Connecting to Atlas URL: ${safeUri}`);
    await client.connect();
    console.log('[DB Keep-Alive] Connected successfully.');

    // Extract database name from connection string URI
    let dbName = 'chemical_inventory';
    const uriPath = uri.split('?')[0];
    const pathSegments = uriPath.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment && lastSegment !== '') {
      dbName = lastSegment;
    }

    const db = client.db(dbName);
    const collectionName = 'chemicals';
    const collection = db.collection(collectionName);

    console.log(`[DB Keep-Alive] Triggering silent read query on collection: '${collectionName}'...`);
    const doc = await collection.findOne({});

    if (doc) {
      console.log('[DB Keep-Alive] Success: Found active database document.');
    } else {
      console.log('[DB Keep-Alive] Success: Database query ran successfully (collection is empty).');
    }
  } catch (error) {
    console.error('[DB Keep-Alive] Keep-alive database execution failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    console.log('[DB Keep-Alive] Closing connection...');
    await client.close();
    console.log('[DB Keep-Alive] Connection closed. Execution ended.');
  }
}

runKeepAlive();
