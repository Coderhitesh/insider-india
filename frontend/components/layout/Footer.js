import Link from 'next/link';
import Logo from './Logo';
import Button from '@/components/ui/Button';
import { NAV } from '@/lib/content';

export default function Footer({ company }) {
  const social = Object.entries(company.social || {}).filter(([, v]) => v);
  const contact = [
    company.phone && { label: company.phone, href: `tel:${company.phone.replace(/\s/g, '')}` },
    company.whatsapp && { label: 'WhatsApp', href: `https://wa.me/${company.whatsapp.replace(/\D/g, '')}` },
    company.email && { label: company.email, href: `mailto:${company.email}` },
  ].filter(Boolean);

  return (
    <footer className="grid-paper-invert bg-wine text-paper">
      <div className="container-x border-b border-white/25 py-14">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <p className="max-w-2xl font-display text-d3">Measured on site. Priced item by item.</p>
          <div className="flex flex-wrap gap-3">
            <Button href="/estimate" variant="light">Get free estimate</Button>
            <Button href="/book-consultation" variant="outlineLight">Book a consultation</Button>
          </div>
        </div>
      </div>
      <div className="container-x grid gap-12 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo company={company} inverse />
          <p className="mt-5 max-w-sm text-paper/85">{company.tagline}</p>
          {company.address && <address className="mt-6 not-italic text-sm text-paper/80">{company.address}</address>}
          {contact.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm font-medium">
              {contact.map((c) => <li key={c.href}><a href={c.href} className="underline-offset-4 hover:underline">{c.label}</a></li>)}
            </ul>
          )}
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-sm md:col-span-7 md:grid-cols-3">
          <div>
            <p className="mb-3 font-semibold text-paper/70">Solutions</p>
            <ul className="space-y-2">{NAV.slice(0, 5).map((n) => <li key={n.href}><Link href={n.href} className="underline-offset-4 hover:underline">{n.label}</Link></li>)}</ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-paper/70">Company</p>
            <ul className="space-y-2">
              {[['/about', 'About'], ['/packages', 'Packages'], ['/projects', 'Projects'], ['/how-it-works', 'How it works'], ['/warranty', 'Warranty'], ['/contact', 'Contact']].map(([h, l]) => (
                <li key={h}><Link href={h} className="underline-offset-4 hover:underline">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-paper/70">Your account</p>
            <ul className="space-y-2">
              <li><Link href="/login" className="underline-offset-4 hover:underline">Customer login</Link></li>
              <li><Link href="/account/dashboard" className="underline-offset-4 hover:underline">Dashboard</Link></li>
            </ul>
            {social.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1">
                {social.map(([k, v]) => <li key={k}><a href={v} target="_blank" rel="noopener noreferrer" className="capitalize underline-offset-4 hover:underline">{k}</a></li>)}
              </ul>
            )}
          </div>
        </nav>
      </div>
      <div className="bg-wine-deep">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-paper/80 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {company.name}{company.gstNumber ? `. GSTIN ${company.gstNumber}` : ''}</p>
          <p className="flex gap-5"><Link href="/privacy-policy" className="hover:text-paper">Privacy policy</Link><Link href="/terms" className="hover:text-paper">Terms</Link></p>
        </div>
      </div>
    </footer>
  );
}
