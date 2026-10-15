import { SITE_URL } from '@/lib/config';
import { getProjectSlugs } from '@/lib/server-api';

export const revalidate = 3600;

const STATIC = [
  ['/', 1, 'weekly'], ['/estimate', 0.9, 'monthly'], ['/book-consultation', 0.9, 'monthly'], ['/packages', 0.9, 'weekly'],
  ['/interiors', 0.8, 'monthly'], ['/kitchen', 0.8, 'monthly'], ['/wardrobes', 0.8, 'monthly'], ['/renovation', 0.8, 'monthly'],
  ['/commercial-interiors', 0.8, 'monthly'], ['/services', 0.7, 'monthly'], ['/projects', 0.8, 'weekly'], ['/how-it-works', 0.6, 'monthly'],
  ['/warranty', 0.5, 'monthly'], ['/about', 0.5, 'monthly'], ['/contact', 0.5, 'monthly'], ['/privacy-policy', 0.2, 'yearly'], ['/terms', 0.2, 'yearly'],
];

export default async function sitemap() {
  const projects = await getProjectSlugs();
  return [
    ...STATIC.map(([path, priority, changeFrequency]) => ({ url: `${SITE_URL}${path}`, priority, changeFrequency, lastModified: new Date() })),
    ...projects.map((p) => ({ url: `${SITE_URL}/project/${p.slug}`, lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(), priority: 0.6, changeFrequency: 'monthly' })),
  ];
}
