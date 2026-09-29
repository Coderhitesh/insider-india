import 'server-only';
import { SERVER_API_URL, COMPANY_FALLBACK } from './config';

// Server-side reads for public pages. Cached with ISR; never throws so pages render if the API is down.
async function getJSON(path, { revalidate = 300, fallback = null } = {}) {
  try {
    const res = await fetch(`${SERVER_API_URL}/api/v1${path}`, { next: { revalidate }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return fallback;
    const body = await res.json();
    return body?.success ? body.data : fallback;
  } catch {
    return fallback;
  }
}

export async function getSite() {
  const data = await getJSON('/catalog/site', { fallback: {} });
  return { company: { ...COMPANY_FALLBACK, ...(data?.company || {}) }, stats: data?.stats || [] };
}
export const getPackages = async () => (await getJSON('/catalog/packages', { fallback: {} }))?.packages || [];
export const getServices = async () => (await getJSON('/catalog/services', { fallback: {} }))?.services || [];
export const getTestimonials = async () => (await getJSON('/catalog/testimonials', { fallback: {} }))?.items || [];
export const getFaqs = async (category) => (await getJSON(`/catalog/faqs${category ? `?category=${category}` : ''}`, { fallback: {} }))?.items || [];
export async function getProjects({ category, featured, page = 1, limit = 12 } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) qs.set('category', category);
  if (featured) qs.set('featured', 'true');
  const data = await getJSON(`/catalog/projects?${qs}`, { fallback: null });
  return { items: data?.items || [], ok: data !== null };
}
export const getProject = (slug) => getJSON(`/catalog/projects/${encodeURIComponent(slug)}`, { fallback: null });
export const getProjectSlugs = async () => (await getJSON('/catalog/projects/slugs', { revalidate: 3600, fallback: {} }))?.items || [];
