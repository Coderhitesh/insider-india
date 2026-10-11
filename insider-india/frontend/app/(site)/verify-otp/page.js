import { Suspense } from 'react';
import VerifyOtp from '@/features/auth/VerifyOtp';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Verify your number', description: 'Enter the one-time code sent to your mobile.', path: '/verify-otp', noindex: true });

export default function VerifyOtpPage() {
  return (
    <div className="container-x min-h-[70vh] py-16">
      <h1 className="text-d2">Verify your number</h1>
      <div className="mt-10 max-w-xl"><Suspense><VerifyOtp /></Suspense></div>
    </div>
  );
}
