const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../../config/env');
const { hmac } = require('../../utils/crypto');
const { toStoredPath } = require('../../utils/fileUrl');

// Development storage on local disk. Files are served by GET /api/v1/files/*:
// public/ keys directly, private/ keys only with a valid, expiring signature.
class LocalStorageProvider {
  constructor() {
    this.name = 'LOCAL';
    this.root = env.localStorageDir;
    this.configured = env.allowLocalStorage;
  }

  static sign(key, exp) { return hmac(`file:${key}:${exp}`); }

  async upload(buffer, { folder, extension, isPrivate }) {
    const key = `${isPrivate ? 'private' : 'public'}/${folder}/${crypto.randomUUID()}.${extension}`;
    const file = path.join(this.root, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, buffer);
    // Only the path is stored — no host — so images keep working on any domain/port.
    return { key, url: isPrivate ? null : `/api/v1/files/${key}`, size: buffer.length, meta: {} };
  }

  async delete(media) {
    await fs.unlink(path.join(this.root, media.key)).catch((err) => { if (err.code !== 'ENOENT') throw err; });
  }

  async getUrl(media, { expiresInSeconds = 900 } = {}) {
    if (!media.isPrivate) return toStoredPath(media.url) || `/api/v1/files/${media.key}`;
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `/api/v1/files/${media.key}?exp=${exp}&sig=${LocalStorageProvider.sign(media.key, exp)}`;
  }
}

module.exports = LocalStorageProvider;
