const mongoose = require('mongoose');
const { normalizeDeep } = require('../utils/fileUrl');
const logger = require('../utils/logger');

// Logs and short-lived collections never hold image links worth rewriting.
const SKIP = new Set(['auditlogs', 'activitylogs', 'notifications', 'otps', 'refreshtokens', 'counters', 'sequences']);

/**
 * Rewrites stored absolute local file URLs ("http://localhost:5991/api/v1/files/…") to paths
 * ("/api/v1/files/…") in every collection. Idempotent; safe to run on every start.
 */
async function migrateFileUrls() {
  const db = mongoose.connection.db;
  let changed = 0;
  const cols = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of cols) {
    if (SKIP.has(name.toLowerCase()) || name.startsWith('system.')) continue;
    const col = db.collection(name);
    for await (const doc of col.find({})) {
      const { _id, ...rest } = doc;
      const next = normalizeDeep(rest);
      if (JSON.stringify(next) === JSON.stringify(rest)) continue;
      await col.replaceOne({ _id }, { _id, ...next });
      changed += 1;
    }
  }
  if (changed) logger.info(`File URLs: ${changed} document(s) now store paths instead of full URLs`);
  return changed;
}

module.exports = { migrateFileUrls };
