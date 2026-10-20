import GalleryView from '@/components/gallery/GalleryView';
import { getGallery } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 60;
export const metadata = pageMetadata({ title: 'Interior Design Gallery', description: 'Photos of full home interiors, modular kitchens, bedrooms, wardrobes, living rooms and offices designed by INSIDER INDIA LLP.', path: '/gallery' });

export default async function GalleryPage() {
  return <GalleryView gallery={await getGallery()} />;
}
