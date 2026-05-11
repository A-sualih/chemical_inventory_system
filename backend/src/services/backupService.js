const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const BACKUP_DIR = path.join(__dirname, '../../backups');

/**
 * Creates a full backup of all collections in the database.
 */
exports.createFullBackup = async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};
    
    for (const col of collections) {
      const data = await mongoose.connection.db.collection(col.name).find({}).toArray();
      backupData[col.name] = data;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json.gz`;
    const filePath = path.join(BACKUP_DIR, fileName);
    
    const compressed = await gzip(JSON.stringify(backupData));
    await fs.writeFile(filePath, compressed);
    
    return {
      fileName,
      filePath,
      size: compressed.length,
      timestamp: new Date()
    };
  } catch (err) {
    console.error('[BackupService] Backup failed:', err);
    throw err;
  }
};

/**
 * Restores the database from a backup file.
 */
exports.restoreFromBackup = async (fileName) => {
  try {
    const filePath = path.join(BACKUP_DIR, fileName);
    const compressed = await fs.readFile(filePath);
    const decompressed = await gunzip(compressed);
    const backupData = JSON.parse(decompressed.toString());
    
    for (const colName in backupData) {
      console.log(`[BackupService] Restoring collection: ${colName}`);
      await mongoose.connection.db.collection(colName).deleteMany({});
      if (backupData[colName].length > 0) {
        // Convert string IDs back to ObjectIds if necessary
        const processedData = backupData[colName].map(doc => {
          if (doc._id) doc._id = new mongoose.Types.ObjectId(doc._id);
          return doc;
        });
        await mongoose.connection.db.collection(colName).insertMany(processedData);
      }
    }
    
    return { success: true, collectionsRestored: Object.keys(backupData).length };
  } catch (err) {
    console.error('[BackupService] Restore failed:', err);
    throw err;
  }
};

/**
 * Lists available backups.
 */
exports.listBackups = async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    
    const backups = await Promise.all(
      files
        .filter(f => f.endsWith('.gz'))
        .map(async (f) => {
          const stats = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            fileName: f,
            size: stats.size,
            createdAt: stats.birthtime
          };
        })
    );
    
    return backups.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    return [];
  }
};
