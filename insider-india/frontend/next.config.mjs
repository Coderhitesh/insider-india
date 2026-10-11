// Files served by the API itself (LOCAL storage in development).
const apiUrl = (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'); } catch { return null; } })();

const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      ...extraHosts.map((hostname) => ({ protocol: 'https', hostname })),
      ...(apiUrl ? [{ protocol: apiUrl.protocol.replace(':', ''), hostname: apiUrl.hostname, port: apiUrl.port, pathname: '/api/v1/files/**' }] : []),
    ],
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
