import { Suspense } from 'react';
import LoginForm from '@/features/auth/LoginForm';
import Swatch from '@/components/ui/Swatch';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Log in', description: 'Log in to your INSIDER INDIA LLP dashboard with a one-time code.', path: '/login', noindex: true });

export default function LoginPage() {
  return (
    <div className="container-x grid min-h-[70vh] gap-12 py-16 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <h1 className="text-d2">Log in to your dashboard</h1>
        <p className="mt-4 max-w-md text-lg text-graphite">Track your consultation, site visit, quotation and project.</p>
        <div className="mt-10"><Suspense><LoginForm /></Suspense></div>
      </div>
      <div className="hidden grid-cols-3 gap-2 lg:col-span-5 lg:col-start-8 lg:grid" aria-hidden="true">
        <Swatch tone="wine" className="col-span-2" /><Swatch tone="sand" /><Swatch tone="brass" /><Swatch tone="oak" className="col-span-2" />
      </div>
    </div>
  );
}
