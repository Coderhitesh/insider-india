import PageHeader from '@/components/pages/PageHeader';
import ConsultationForm from '@/components/home/ConsultationForm';
import { Section } from '@/components/ui/Section';
import { getSite } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'Contact', description: 'Get in touch with INSIDER INDIA LLP or book an interior design consultation.', path: '/contact' });

export default async function ContactPage() {
  const { company } = await getSite();
  const rows = [
    company.phone && ['Phone', <a key="p" href={`tel:${company.phone.replace(/\s/g, '')}`} className="hover:text-wine">{company.phone}</a>],
    company.whatsapp && ['WhatsApp', <a key="w" href={`https://wa.me/${company.whatsapp.replace(/\D/g, '')}`} className="hover:text-wine" target="_blank" rel="noopener noreferrer">{company.whatsapp}</a>],
    company.email && ['Email', <a key="e" href={`mailto:${company.email}`} className="hover:text-wine">{company.email}</a>],
    company.address && ['Office', <address key="a" className="not-italic">{company.address}</address>],
  ].filter(Boolean);
  return (
    <>
      <PageHeader title="Contact" lede="The quickest way to start is a consultation request — we will call you back." crumbs={[{ name: 'Contact', path: '/contact' }]} />
      <Section>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            {rows.length ? (
              <dl className="space-y-6">{rows.map(([k, v]) => <div key={k} className="border-t border-stone pt-3"><dt className="text-sm text-graphite">{k}</dt><dd className="mt-1 text-lg">{v}</dd></div>)}</dl>
            ) : <p className="text-graphite">Use the form to request a callback.</p>}
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <h2 className="text-d3">Request a consultation</h2>
            <div className="mt-8"><ConsultationForm id="contact" /></div>
          </div>
        </div>
      </Section>
    </>
  );
}
