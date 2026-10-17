import { notFound } from 'next/navigation';
import GalleryView from '@/components/gallery/GalleryView';
import { getGallery } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateStaticParams() {
  const g = await getGallery();
  return g.categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = (await getGallery()).categories.find((x) => x.slug === slug);
  if (!c) return {};
  return pageMetadata({ title: c.seo?.title || `${c.name} Design Ideas & Photos`, description: c.seo?.description || c.description || `${c.name} interior design photos by INSIDER INDIA LLP. Get a free estimate for a space like this.`, path: `/gallery/${slug}`, images: c.coverImage ? [c.coverImage] : undefined });
}

export default async function GalleryCategoryPage({ params }) {
  const { slug } = await params;
  const gallery = await getGallery();
  if (!gallery.categories.some((c) => c.slug === slug)) notFound();
  return <GalleryView gallery={gallery} slug={slug} />;
}
