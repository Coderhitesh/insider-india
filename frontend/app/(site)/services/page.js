import { Check } from 'lucide-react';
import PageHeader from '@/components/pages/PageHeader';
import Solutions from '@/components/landing/Solutions';
import CalcBanner from '@/components/landing/CalcBanner';
import Button from '@/components/ui/Button';
import { Arrow } from '@/components/landing/media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { getServices } from '@/lib/server-api';
import { IMAGES } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'Interior services', description: 'Full home interiors, modular kitchens, wardrobes, renovation, commercial interiors and individual interior services.', path: '/services' });

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <PageHeader eyebrow="Our solutions" title="Interior solutions for every space" lede="Take on the whole home, or pick the rooms and elements you need. Every project follows the same measured, itemised process."
        crumbs={[{ name: 'Services', path: '/services' }]} image={IMAGES.band} imageAlt="Dining area designed by INSIDER INDIA LLP">
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/estimate" size="lg" className="h-13 px-7">Get Free Estimate <Arrow /></Button>
          <Button href="/book-consultation" size="lg" variant="secondary" className="h-13 border-[1.5px] bg-paper px-7">Book a Consultation <Arrow /></Button>
        </div>
      </PageHeader>
      <Solutions services={services} />
      {services.length > 0 && (
        <Section tone="soft" labelledBy="individual-title">
          <SectionHeading id="individual-title" eyebrow="Pick what you need" title="Individual services" intro="Choose any of these when you book a consultation." />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <li key={s.id} className="soft-card flex gap-3 p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blush"><Check className="size-4 text-wine" aria-hidden="true" /></span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  {s.description && <p className="mt-1 text-sm text-graphite">{s.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <div className="pb-14"><CalcBanner /></div>
    </>
  );
}
