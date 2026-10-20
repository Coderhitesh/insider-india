'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OtpVerify from './OtpVerify';
import Spinner from '@/components/ui/Spinner';
import { safeNext } from './LoginForm';
import { useBookingStore } from '@/store/booking';

export default function VerifyOtp() {
  const router = useRouter();
  const params = useSearchParams();
  const [mobile, setMobile] = useState(null);

  useEffect(() => {
    const m = sessionStorage.getItem('ii-login-mobile');
    if (!m) router.replace('/login');
    else setMobile(m);
  }, [router]);

  if (!mobile) return <Spinner className="size-6 text-wine" />;

  return (
    <OtpVerify
      mobile={mobile}
      onChangeNumber={() => router.push('/login')}
      onVerified={(data) => {
        sessionStorage.removeItem('ii-login-mobile');
        const next = safeNext(params.get('next'));
        if (next) return router.replace(next);
        if (data.resumeLead && data.resumeLead.nextStep !== 'SUBMITTED') {
          useBookingStore.getState().setLead(data.resumeLead.id, null);
          return router.replace('/book-consultation');
        }
        return router.replace('/account/dashboard');
      }}
    />
  );
}
