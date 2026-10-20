import { SITE_URL } from '@/lib/config';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/account', '/admin', '/contractor', '/login', '/verify-otp'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
