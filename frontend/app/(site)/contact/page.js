import PageHeader from '@/components/pages/PageHeader';
import ConsultationForm from '@/components/home/ConsultationForm';
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
      <PageHeader eyebrow="Get in touch" image={IMAGES.review} title="Contact us" lede="The quickest way to start is a consultation request — we will call you back." crumbs={[{ name: 'Contact', path: '/contact' }]} />
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
            ) : <p className="soft-card p-5 text-graphite">Use the form to request a callback — we will call you back.</p>}
          </div>
          <div className="rounded-2xl border-2 border-wine/70 p-6 sm:p-8 lg:col-span-7 lg:col-start-6">
            <p className="eyebrow">Talk to a designer</p>
            <h2 className="mt-2 text-[clamp(1.8rem,3vw,2.4rem)] leading-tight">Request a consultation</h2>
            <div className="mt-6"><ConsultationForm id="contact" /></div>
          </div>
        </div>
      </Section>
    </>
  );
}
