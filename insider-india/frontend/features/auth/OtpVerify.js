'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, MessageSquareText } from 'lucide-react';
import OtpInput from '@/components/ui/OtpInput';
import Notice from '@/components/ui/Notice';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

const mask = (m) => `+91 ${'X'.repeat(7)}${String(m).slice(-3)}`;

/**
 * Sends and verifies a one-time code. Used by login, the booking funnel and the estimate funnel.
 * onVerified receives the verify-otp response data ({ accessToken, user, lead, resumeLead }).
 */
export default function OtpVerify({ mobile, leadId, leadToken, name, defaultLength = 4, onVerified, onChangeNumber }) {
  const [phase, setPhase] = useState('sending'); // sending | ready
  const [info, setInfo] = useState({ length: defaultLength, maskedMobile: mask(mobile), channel: 'SMS' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = useCallback(async (channel) => {
    setError('');
    setResending(channel);
    try {
      const res = await api('/auth/send-otp', { method: 'POST', body: { mobile, channel, leadId, leadToken } });
      setInfo(res.data);
      setCooldown(res.data.resendIn || 30);
      setCode('');
    } catch (err) {
      if (err.code === 'OTP_COOLDOWN') setCooldown(err.details?.retryAfter || 30);
      else if (err.code === 'OTP_DELIVERY_FAILED') { setCooldown(0); setError(err.message); }
      else setError(err.message);
    } finally {
      setResending(null);
      setPhase('ready');
    }
  }, [mobile, leadId, leadToken]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    send('SMS');
  }, [send]);

  const verify = async (value = code) => {
    if (value.length !== info.length || verifying) return;
    setVerifying(true);
    setError('');
    try {
      const res = await api('/auth/verify-otp', { method: 'POST', body: { mobile, code: value, leadId, leadToken, name } });
      useAuth.getState().setSession(res.data);
      await onVerified?.(res.data);
    } catch (err) {
      const left = err.details?.remainingAttempts;
      setError(left ? `${err.message} ${left} attempt${left > 1 ? 's' : ''} left.` : err.message);
      setCode('');
      setVerifying(false);
    }
  };

  if (phase === 'sending') {
    return (
      <div className="flex items-center gap-3 py-8 text-lg" role="status">
        <Spinner className="size-5 text-wine" /> Sending your verification code…
      </div>
    );
  }

  return (
    <div>
      <p className="text-lg">Verification code sent to <span className="tabular font-semibold">{info.maskedMobile}</span>
        {info.channel === 'WHATSAPP' ? ' on WhatsApp' : ' by SMS'}.</p>
      {onChangeNumber && <button type="button" onClick={onChangeNumber} className="mt-1 text-sm text-wine underline underline-offset-4">Change number</button>}
      {info.testMode && (
        <Notice className="mt-5 max-w-md">Testing mode: SMS/WhatsApp is not connected yet. Use code <strong className="tabular">{info.testCode}</strong>.</Notice>
      )}

      <form className="mt-8" onSubmit={(e) => { e.preventDefault(); verify(); }}>
        <p className="mb-3 text-sm font-medium" id="otp-label">Enter {info.length}-digit code</p>
        <OtpInput length={info.length} value={code} onChange={setCode} onComplete={verify} disabled={verifying} error={Boolean(error)} />
        {error && <Notice tone="error" className="mt-5 max-w-md">{error}</Notice>}
        <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" loading={verifying} disabled={code.length !== info.length}>Verify and continue</Button>
      </form>

      <div className="mt-8 border-t border-stone pt-5">
        <p className="text-sm text-graphite" aria-live="polite">{cooldown > 0 ? `You can request a new code in ${cooldown}s.` : "Didn't get the code?"}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => send('SMS')} disabled={cooldown > 0} loading={resending === 'SMS'}>
            <MessageSquareText className="size-4" />Resend via SMS
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => send('WHATSAPP')} disabled={cooldown > 0} loading={resending === 'WHATSAPP'}>
            <MessageCircle className="size-4" />Send on WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
