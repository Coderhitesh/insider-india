import { Suspense } from 'react';
import VerifyOtp from '@/features/auth/VerifyOtp';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Verify your number', description: 'Enter the one-time code sent to your mobile.', path: '/verify-otp', noindex: true });

export default function VerifyOtpPage() {
  return (
    <div className="hero-wash">
      <div className="container-x min-h-[72vh] py-12 sm:py-16">
        <div className="mx-auto max-w-xl">
          <p className="eyebrow">One-time code</p>
          <h1 className="mt-3 text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.04]">Verify your number</h1>
          <div className="soft-card mt-8 p-6 sm:p-8"><Suspense><VerifyOtp /></Suspense></div>
        </div>
      </div>
    </div>
  );
}
