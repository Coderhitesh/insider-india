import { Suspense } from 'react';
import BookingFunnel from '@/features/booking/BookingFunnel';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Book a free consultation', description: 'Tell us about your home and book a consultation with an INSIDER INDIA LLP designer.', path: '/book-consultation' });

export default function BookConsultationPage() {
  return <Suspense><BookingFunnel /></Suspense>;
}
