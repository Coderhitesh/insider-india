const settings = require('../settingsService');
const CloudinaryStorageProvider = require('./CloudinaryStorageProvider');
const S3StorageProvider = require('./S3StorageProvider');
const LocalStorageProvider = require('./LocalStorageProvider');
const ApiError = require('../../utils/ApiError');

const FACTORIES = { CLOUDINARY: (cfg) => new CloudinaryStorageProvider(cfg.cloudinary || {}), S3: (cfg) => new S3StorageProvider(cfg.s3 || {}), LOCAL: () => new LocalStorageProvider() };
const instances = new Map();
settings.onChange((key) => { if (key === 'storage') instances.clear(); });

async function getConfig() {
  return (await settings.get('storage', { active: 'CLOUDINARY' })) || { active: 'CLOUDINARY' };
}

async function getProvider(name) {
  const cfg = await getConfig();
  const providerName = (name || cfg.active || 'CLOUDINARY').toUpperCase();
  if (!instances.has(providerName)) {
    const factory = FACTORIES[providerName];
    if (!factory) throw ApiError.unavailable(`Unknown storage provider ${providerName}`, 'STORAGE_UNKNOWN');
    instances.set(providerName, factory(cfg));
  }
  const provider = instances.get(providerName);
  if (!provider.configured) throw ApiError.unavailable(providerName === 'LOCAL' ? 'Local storage is disabled on this server. Configure Cloudinary or S3.' : 'File storage is not configured. Please contact support.', 'STORAGE_NOT_CONFIGURED');
  return provider;
}

// Uploads always go to the ACTIVE provider; delete/getUrl use the provider the file was stored with.
const StorageService = {
  async upload(buffer, opts) {
    const provider = await getProvider();
    const out = await provider.upload(buffer, opts);
    return { provider: provider.name, ...out };
  },
  async delete(media) {
    const provider = await getProvider(media.provider);
    await provider.delete(media);
  },
  async getUrl(media, opts) {
    const provider = await getProvider(media.provider);
    return provider.getUrl(media, opts);
  },
  getProvider,
};

module.exports = StorageService;
