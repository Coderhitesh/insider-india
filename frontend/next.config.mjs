import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Version stamp for photos in public/images: changes whenever a file there is replaced,
// so the browser and the Next image cache never serve an old copy. Restart `npm run dev` after replacing.
const imgVersion = (() => {
  const h = createHash('sha1');
  const walk = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, f.name);
      if (f.isDirectory()) walk(p); else { const st = statSync(p); h.update(`${p}:${st.size}:${st.mtimeMs}`); }
    }
  };
  try { walk(join(process.cwd(), 'public', 'images')); } catch { /* no images folder */ }
  return h.digest('hex').slice(0, 10);
})();

// Files served by the API itself (LOCAL storage in development).
const apiUrl = (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5991'); } catch { return null; } })();

const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_IMG_V: imgVersion },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90],
    localPatterns: [
      { pathname: '/images/**', search: `?v=${imgVersion}` },
      { pathname: '/**', search: '' },
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      ...extraHosts.map((hostname) => ({ protocol: 'https', hostname })),
      ...(apiUrl ? [{ protocol: apiUrl.protocol.replace(':', ''), hostname: apiUrl.hostname, port: apiUrl.port, pathname: '/api/v1/files/**' }] : []),
    ],
  },
  // Uploaded files are stored as paths ("/api/v1/files/…"); serve them through this site from the API.
  async rewrites() {
    const target = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5991').replace(/\/$/, '');
    return [{ source: '/api/v1/files/:path*', destination: `${target}/api/v1/files/:path*` }];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

export default nextConfig;
