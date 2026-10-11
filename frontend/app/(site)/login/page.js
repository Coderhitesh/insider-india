import { Suspense } from 'react';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import LoginForm from '@/features/auth/LoginForm';
import { IMAGES } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Log in', description: 'Log in to your INSIDER INDIA LLP dashboard with a one-time code.', path: '/login', noindex: true });

export default function LoginPage() {
  return (
    <div className="hero-wash">
      <div className="container-x grid min-h-[72vh] items-center gap-10 py-12 sm:py-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow">Customer login</p>
          <h1 className="mt-3 text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1.04]">Log in to your <span className="text-wine">dashboard</span></h1>
          <p className="mt-4 max-w-md text-[1.02rem] text-graphite">Track your consultation, site visit, quotation and project.</p>
          <div className="soft-card mt-8 max-w-md p-6 sm:p-8"><Suspense><LoginForm /></Suspense></div>
          <p className="mt-4 flex items-center gap-2 text-xs text-graphite"><ShieldCheck className="size-4 text-wine" aria-hidden="true" />No password — we verify your number with a one-time code.</p>
        </div>
        <div className="relative hidden aspect-[4/3.4] overflow-hidden rounded-[28px] lg:col-span-6 lg:block" aria-hidden="true">
          <Image src={IMAGES.hero} alt="" fill sizes="45vw" className="object-cover" priority />
          <div className="absolute bottom-5 right-5 rounded-xl bg-white/95 px-4 py-3 text-sm font-medium shadow-lg">Your home, tracked step by step</div>
        </div>
      </div>
    </div>
  );
}
