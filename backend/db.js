const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'inventory.sqlite');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  return dbInstance;
}

async function initDb() {
  const db = await getDb();
  
  // Users table (1.1 Auth & 1.2 RBAC)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Viewer/Auditor',
      status TEXT DEFAULT 'Active',
      failed_attempts INTEGER DEFAULT 0,
      locked_until DATETIME
    );
  `);

  // Chemicals table (1.3 Lifecycle)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chemicals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      iupac_name TEXT,
      cas_number TEXT,
      formula TEXT,
      quantity REAL,
      unit TEXT,
      state TEXT,
      purity TEXT,
      storage_temp TEXT,
      storage_humidity TEXT,
      supplier TEXT,
      batch_number TEXT,
      expiry_date DATE,
      ghs_classes TEXT, -- JSON array
      sds_attached BOOLEAN,
      location TEXT,
      status TEXT,
      archived BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Inventory Logs (1.4 Inventory Tracking)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chemical_id TEXT,
      user_id INTEGER,
      action TEXT,
      quantity_change REAL,
      reason TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(chemical_id) REFERENCES chemicals(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Requests table (1.12 Request Workflow)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chemical_id TEXT,
      user_id INTEGER,
      quantity REAL,
      status TEXT DEFAULT 'Pending',
      justification TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(chemical_id) REFERENCES chemicals(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Disposals table (1.13 Waste Management)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS disposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chemical_id TEXT,
      user_id INTEGER,
      quantity REAL,
      method TEXT,
      regulatory_log TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(chemical_id) REFERENCES chemicals(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Locations table (1.5 Storage)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      building TEXT,
      room TEXT,
      cabinet TEXT,
      shelf TEXT,
      capacity REAL,
      current_load REAL DEFAULT 0,
      safety_warnings TEXT
    );
  `);

  // Seed default admin user
  const adminExists = await db.get('SELECT * FROM users WHERE email = ?', ['admin@lab.com']);
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['System Admin', 'admin@lab.com', hash, 'Admin']);
  }
}

module.exports = {
  getDb,
  initDb
};
