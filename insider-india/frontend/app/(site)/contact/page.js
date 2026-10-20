import PageHeader from '@/components/pages/PageHeader';
import ContactForm from '@/components/home/ContactForm';
import Button from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { getSite } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';
import { Phone, MessageCircle, Mail, MapPin } from 'lucide-react';
import { IMAGES } from '@/lib/content';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'Contact', description: 'Get in touch with INSIDER INDIA LLP or book an interior design consultation.', path: '/contact' });

export default async function ContactPage() {
  const { company } = await getSite();
  const rows = [
    company.phone && ['Phone', Phone, <a key="p" href={`tel:${company.phone.replace(/\s/g, '')}`} className="hover:text-wine">{company.phone}</a>],
    company.whatsapp && ['WhatsApp', MessageCircle, <a key="w" href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`} className="hover:text-wine" target="_blank" rel="noopener noreferrer">{company.whatsapp}</a>],
    company.email && ['Email', Mail, <a key="e" href={`mailto:${company.email}`} className="hover:text-wine">{company.email}</a>],
    company.address && ['Office', MapPin, <address key="a" className="not-italic">{company.address}</address>],
  ].filter(Boolean);
  return (
    <>
      <PageHeader eyebrow="Get in touch" image={IMAGES.review} title="Contact us" lede="Questions, feedback or a new project — send us a message and our team will get back to you." crumbs={[{ name: 'Contact', path: '/contact' }]} />
      <Section>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            {rows.length ? (
              <dl className="space-y-3">{rows.map(([k, Icon, v]) => (
                <div key={k} className="soft-card flex gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blush"><Icon className="size-5 text-wine" aria-hidden="true" /></span>
                  <div><dt className="text-xs uppercase tracking-wider text-graphite">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
                </div>
              ))}</dl>
            ) : <p className="soft-card p-5 text-graphite">Send us a message using the form — we usually reply within one working day.</p>}
            <div className="mt-6 rounded-2xl bg-blush/60 p-5">
              <p className="font-medium">Planning your interiors?</p>
              <p className="mt-1 text-sm text-graphite">Get an indicative budget in minutes or book a free consultation with a designer.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/estimate" size="sm">Get Free Estimate</Button>
                <Button href="/book-consultation" size="sm" variant="secondary">Book a Consultation</Button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-wine/70 p-6 sm:p-8 lg:col-span-7 lg:col-start-6">
            <p className="eyebrow">Write to us</p>
            <h2 className="mt-2 text-[clamp(1.8rem,3vw,2.4rem)] leading-tight">Send us a message</h2>
            <div className="relative mt-6"><ContactForm /></div>
          </div>
        </div>
      </Section>
    </>
  );
}
