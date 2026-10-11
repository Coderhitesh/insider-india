import Link from 'next/link';
import { Phone, Mail, MapPin, Instagram, Facebook, Linkedin, Youtube, Twitter, Globe, MessageCircle } from 'lucide-react';
import Logo from './Logo';

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube, twitter: Twitter, x: Twitter };

const COLS = [
  { title: 'Quick Links', links: [['/', 'Home'], ['/services', 'Solutions'], ['/packages', 'Packages'], ['/projects', 'Projects'], ['/about', 'About Us'], ['/contact', 'Contact']] },
  { title: 'Our Solutions', links: [['/interiors', 'Full Home Interiors'], ['/kitchen', 'Modular Kitchens'], ['/wardrobes', 'Wardrobes & Storage'], ['/renovation', 'Renovation'], ['/commercial-interiors', 'Commercial Interiors']] },
  { title: 'Support', links: [['/estimate', 'Get Free Estimate'], ['/book-consultation', 'Book a Consultation'], ['/how-it-works', 'How It Works'], ['/warranty', 'Warranty'], ['/terms', 'Terms & Conditions'], ['/privacy-policy', 'Privacy Policy']] },
];

export default function Footer({ company }) {
  const social = Object.entries(company.social || {}).filter(([, v]) => v);
  const contact = [
    company.phone && { icon: Phone, label: company.phone, href: `tel:${company.phone.replace(/\s/g, '')}` },
    company.whatsapp && { icon: MessageCircle, label: 'WhatsApp us', href: `https://wa.me/${company.whatsapp.replace(/\D/g, '')}` },
    company.email && { icon: Mail, label: company.email, href: `mailto:${company.email}` },
    company.address && { icon: MapPin, label: company.address },
  ].filter(Boolean);

  return (
    <footer className="red-panel relative overflow-hidden text-paper">
      <div className="container-x relative grid gap-10 py-14 md:grid-cols-12 lg:gap-8">
        <div className="md:col-span-12 lg:col-span-3">
          <Logo company={company} inverse />
          <p className="mt-5 max-w-xs text-sm text-paper/85">{company.tagline || 'Interiors designed around the way you live.'}</p>
          {social.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-4">
              {social.map(([k, v]) => {
                const Icon = SOCIAL_ICON[k.toLowerCase()] || Globe;
                return <li key={k}><a href={v} target="_blank" rel="noopener noreferrer" aria-label={k} className="text-paper/90 transition-colors hover:text-paper"><Icon className="size-[18px]" /></a></li>;
              })}
            </ul>
          )}
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3 md:col-span-8 lg:col-span-6 lg:border-l lg:border-white/15 lg:pl-10">
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="mb-4 font-semibold">{c.title}</p>
              <ul className="space-y-2 text-paper/80">
                {c.links.map(([h, l]) => <li key={h}><Link href={h} className="transition-colors hover:text-paper">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </nav>

        <div className="text-sm md:col-span-4 lg:col-span-3 lg:border-l lg:border-white/15 lg:pl-10">
          <p className="mb-4 font-semibold">Get in touch</p>
          {contact.length > 0 ? (
            <ul className="space-y-3.5 text-paper/85">
              {contact.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <c.icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {c.href ? <a href={c.href} className="break-words hover:text-paper">{c.label}</a> : <address className="not-italic">{c.label}</address>}
                </li>
              ))}
            </ul>
          ) : <p className="text-paper/80"><Link href="/contact" className="underline underline-offset-4">Contact us</Link></p>}
        </div>
      </div>
      <div className="relative bg-black/15">
        <div className="container-x flex flex-col gap-2 py-4 text-xs text-paper/80 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {company.name}. All rights reserved.{company.gstNumber ? ` GSTIN ${company.gstNumber}` : ''}</p>
          <p>Interiors for a better everyday.</p>
        </div>
      </div>
    </footer>
  );
}
