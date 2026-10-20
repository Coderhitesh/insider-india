const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Public objects live under `<prefix>/public/` (grant read via bucket policy/CDN);
// private objects under `<prefix>/private/` and are served via presigned URLs.
class S3StorageProvider {
  constructor(cfg) {
    this.name = 'S3';
    this.bucket = cfg.bucket;
    this.region = cfg.region;
    this.cdnUrl = (cfg.cdnUrl || '').replace(/\/$/, '');
    this.prefix = cfg.prefix || 'insider-india';
    this.configured = Boolean(cfg.accessKeyId && cfg.secretAccessKey && cfg.bucket && cfg.region);
    this.client = new S3Client({
      region: cfg.region,
      credentials: cfg.accessKeyId ? { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } : undefined,
    });
  }

  publicUrl(key) {
    return this.cdnUrl ? `${this.cdnUrl}/${key}` : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async upload(buffer, { folder, mimeType, extension, isPrivate }) {
    const key = `${this.prefix}/${isPrivate ? 'private' : 'public'}/${folder}/${crypto.randomUUID()}.${extension}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: isPrivate ? 'private, max-age=0' : 'public, max-age=31536000, immutable',
      ServerSideEncryption: 'AES256',
    }));
    return { key, url: isPrivate ? null : this.publicUrl(key), size: buffer.length, meta: { bucket: this.bucket, region: this.region } };
  }

  async delete(media) {
    await this.client.send(new DeleteObjectCommand({ Bucket: media.meta?.bucket || this.bucket, Key: media.key }));
  }

  async getUrl(media, { expiresInSeconds = 900 } = {}) {
    if (!media.isPrivate) return media.url || this.publicUrl(media.key);
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: media.meta?.bucket || this.bucket, Key: media.key }), { expiresIn: expiresInSeconds });
  }
}

module.exports = S3StorageProvider;
