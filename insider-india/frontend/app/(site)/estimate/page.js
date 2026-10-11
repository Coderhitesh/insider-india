import { Suspense } from 'react';
import EstimateFunnel from '@/features/estimate/EstimateFunnel';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Interior budget calculator', description: 'Get an indicative interior budget for your home in five quick steps. Compare packages and book a free consultation.', path: '/estimate' });

export default function EstimatePage() {
  return <Suspense><EstimateFunnel /></Suspense>;
}
