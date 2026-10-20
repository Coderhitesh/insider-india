'use client';

import { usePathname } from 'next/navigation';

const HIDE_ON = ['/book-consultation', '/estimate', '/verify-otp'];

/** Floating WhatsApp chat button (bottom-right). Hidden inside the funnels so it never covers "Continue". */
export default function WhatsAppFab({ number, message = 'Hi INSIDER INDIA, I would like to know more about your interior services.' }) {
  const pathname = usePathname();
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits || HIDE_ON.some((p) => pathname.startsWith(p))) return null;
  const to = digits.length === 10 ? `91${digits}` : digits;
  return (
    <a href={`https://wa.me/${to}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
      className="wa-fab group fixed bottom-5 right-5 z-[55] flex items-center gap-2 sm:bottom-6 sm:right-6">
      <span className="pointer-events-none hidden translate-x-2 rounded-full bg-paper px-3 py-1.5 text-sm font-medium text-charcoal opacity-0 shadow-lg ring-1 ring-stone transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:block">Chat with us</span>
      <span className="relative flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_25px_-6px_rgb(37_211_102/.6)] transition-transform duration-300 group-hover:scale-110">
        <span className="wa-ping absolute inset-0 rounded-full bg-[#25D366]" aria-hidden="true" />
        <svg viewBox="0 0 32 32" className="relative size-7" fill="currentColor" aria-hidden="true"><path d="M16.04 3C9.4 3 4 8.36 4 14.95c0 2.1.56 4.15 1.62 5.95L4 29l8.3-1.6a12.1 12.1 0 0 0 3.74.6C22.68 28 28 22.64 28 16.05 28 9.45 22.68 3 16.04 3Zm0 22.86c-1.18 0-2.34-.2-3.43-.6l-.6-.22-4.93.95.97-4.79-.25-.62a9.75 9.75 0 0 1-.93-4.18c0-5.4 4.38-9.8 9.17-9.8 5.43 0 9.8 4.4 9.8 9.8 0 5.41-4.37 9.46-9.8 9.46Zm5.38-7.3c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.48-.5-.67-.5h-.57c-.2 0-.52.08-.79.37-.27.3-1.03 1-1.03 2.45 0 1.44 1.06 2.84 1.2 3.03.15.2 2.08 3.17 5.04 4.45.7.3 1.25.48 1.68.62.7.22 1.35.19 1.85.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" /></svg>
      </span>
    </a>
  );
}
