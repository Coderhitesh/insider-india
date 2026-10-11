const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

class CloudinaryStorageProvider {
  constructor(cfg) {
    this.name = 'CLOUDINARY';
    this.creds = { cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret };
    this.folder = cfg.folder || 'insider-india';
    this.configured = Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret);
  }

  async upload(buffer, { folder, mimeType, extension, isPrivate }) {
    const resourceType = mimeType === 'application/pdf' ? 'raw' : mimeType.startsWith('video/') ? 'video' : 'image';
    const id = crypto.randomUUID();
    const publicId = `${this.folder}/${isPrivate ? 'private' : 'public'}/${folder}/${resourceType === 'raw' ? `${id}.${extension}` : id}`;
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { ...this.creds, public_id: publicId, resource_type: resourceType, type: isPrivate ? 'private' : 'upload', overwrite: false },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
      stream.end(buffer);
    });
    return {
      key: result.public_id,
      url: isPrivate ? null : result.secure_url,
      size: result.bytes,
      meta: { resourceType, type: isPrivate ? 'private' : 'upload', format: result.format || extension, width: result.width, height: result.height },
    };
  }

  async delete(media) {
    await cloudinary.uploader.destroy(media.key, {
      ...this.creds,
      resource_type: media.meta?.resourceType || 'image',
      type: media.meta?.type || 'upload',
      invalidate: true,
    });
  }

  async getUrl(media, { expiresInSeconds = 900 } = {}) {
    if (!media.isPrivate) return media.url;
    const resourceType = media.meta?.resourceType || 'image';
    const format = resourceType === 'raw' ? '' : media.meta?.format || media.extension;
    return cloudinary.utils.private_download_url(media.key, format, {
      ...this.creds,
      resource_type: resourceType,
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
  }
}

module.exports = CloudinaryStorageProvider;
