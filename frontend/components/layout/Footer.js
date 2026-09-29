import Link from 'next/link';
import Logo from './Logo';
import { NAV } from '@/lib/content';

export default function Footer({ company }) {
  const social = Object.entries(company.social || {}).filter(([, v]) => v);
  const contact = [
    company.phone && { label: company.phone, href: `tel:${company.phone.replace(/\s/g, '')}` },
    company.whatsapp && { label: 'WhatsApp', href: `https://wa.me/${company.whatsapp.replace(/\D/g, '')}` },
    company.email && { label: company.email, href: `mailto:${company.email}` },
  ].filter(Boolean);

  return (
    <footer className="bg-charcoal text-paper">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo company={company} inverse />
          <p className="mt-5 max-w-sm text-stone">{company.tagline}</p>
          {company.address && <address className="mt-6 not-italic text-sm text-stone/80">{company.address}</address>}
          {contact.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {contact.map((c) => <li key={c.href}><a href={c.href} className="hover:text-brass">{c.label}</a></li>)}
            </ul>
          )}
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-sm md:col-span-7 md:grid-cols-3">
          <div>
            <p className="mb-3 text-stone/70">Solutions</p>
            <ul className="space-y-2">{NAV.slice(0, 5).map((n) => <li key={n.href}><Link href={n.href} className="hover:text-brass">{n.label}</Link></li>)}</ul>
          </div>
          <div>
            <p className="mb-3 text-stone/70">Company</p>
            <ul className="space-y-2">
              {[['/about', 'About'], ['/packages', 'Packages'], ['/projects', 'Projects'], ['/how-it-works', 'How it works'], ['/warranty', 'Warranty'], ['/contact', 'Contact']].map(([h, l]) => (
                <li key={h}><Link href={h} className="hover:text-brass">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-stone/70">Get started</p>
            <ul className="space-y-2">
              <li><Link href="/estimate" className="hover:text-brass">Calculate my budget</Link></li>
              <li><Link href="/book-consultation" className="hover:text-brass">Book a consultation</Link></li>
              <li><Link href="/login" className="hover:text-brass">Customer login</Link></li>
            </ul>
            {social.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1">
                {social.map(([k, v]) => <li key={k}><a href={v} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-brass">{k}</a></li>)}
              </ul>
            )}
          </div>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-stone/70 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {company.name}{company.gstNumber ? `. GSTIN ${company.gstNumber}` : ''}</p>
          <p className="flex gap-5"><Link href="/privacy-policy" className="hover:text-paper">Privacy policy</Link><Link href="/terms" className="hover:text-paper">Terms</Link></p>
        </div>
      </div>
    </footer>
  );
}
