import PageHeader from '@/components/pages/PageHeader';
import Solutions from '@/components/home/Solutions';
import { Section, SectionHeading } from '@/components/ui/Section';
import { getServices } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'Interior services', description: 'Full home interiors, modular kitchens, wardrobes, renovation, commercial interiors and individual interior services.', path: '/services' });

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <PageHeader title="Services" lede="Take on the whole home, or pick the rooms and elements you need." crumbs={[{ name: 'Services', path: '/services' }]} />
      <Solutions />
      {services.length > 0 && (
        <Section tone="paper" labelledBy="individual-title">
          <SectionHeading id="individual-title" title="Individual services" intro="Choose any of these when you book a consultation." />
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <li key={s.id} className="border-t border-stone py-5">
                <p className="text-lg font-semibold">{s.title}</p>
                {s.description && <p className="mt-1 text-sm text-graphite">{s.description}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
