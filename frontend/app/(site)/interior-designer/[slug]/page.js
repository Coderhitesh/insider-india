import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import PageHeader from '@/components/pages/PageHeader';
import Button from '@/components/ui/Button';
import JsonLd from '@/components/ui/JsonLd';
import { Arrow } from '@/components/landing/media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { IMAGES, SOLUTIONS } from '@/lib/content';
import { LOCATIONS, locationBySlug, nearby } from '@/lib/locations';
import { getSite } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/config';

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => LOCATIONS.map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const l = locationBySlug(slug);
  if (!l) return {};
  return pageMetadata({
    title: `Interior Designer in ${l.name}, Delhi NCR`,
    description: `Home and office interior designers in ${l.name}. Full home interiors, modular kitchens, wardrobes and renovation with a free site visit, item-wise quotation and 45-day handover guarantee.`,
    path: `/interior-designer/${slug}`,
  });
}

export default async function LocationPage({ params }) {
  const { slug } = await params;
  const l = locationBySlug(slug);
  if (!l) notFound();
  const { company } = await getSite();
  const area = l.region === 'Delhi' || l.region === 'NCR' ? l.name : `${l.name}, ${l.region}`;
  const points = [
    `Free design consultation and site visit anywhere in ${l.name}`,
    'Measured, item-wise quotation — no hidden costs',
    '45-day handover, otherwise we pay ₹1,000 per day',
    'Warranty of up to 20 years on modular work',
    'Track design, production and installation in your dashboard',
  ];
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness', name: company.name, url: `${SITE_URL}/interior-designer/${slug}`,
        areaServed: { '@type': 'Place', name: `${l.name}, ${l.region === 'NCR' ? 'Delhi NCR' : 'Delhi'}` },
        ...(company.phone ? { telephone: company.phone } : {}),
      }} />
      <PageHeader eyebrow="Interior designers near you" title={<>Interior Designer in <span className="text-wine">{l.name}</span></>}
        lede={`Homes, kitchens, wardrobes and offices in ${area} — designed around the way you live and delivered on time.`}
        crumbs={[{ name: `Interior Designer in ${l.name}`, path: `/interior-designer/${slug}` }]}
        image={IMAGES.hero} imageAlt={`Interior design in ${l.name}`}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/estimate" size="lg" className="h-13 px-7">Get Free Estimate <Arrow /></Button>
          <Button href="/book-consultation" size="lg" variant="secondary" className="h-13 border-[1.5px] bg-paper px-7">Book a Consultation <Arrow /></Button>
        </div>
      </PageHeader>

      <Section labelledBy="why-title">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow">Why {company.name}</p>
            <h2 id="why-title" className="mt-2 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.08]">Your interior partner in {l.name}</h2>
            <p className="mt-4 leading-relaxed text-graphite">From a compact apartment to a large independent house or a new office, our designers in {area} handle everything — layout, materials, modular furniture, false ceiling, lighting, painting and on-site execution — with one point of contact and a clear timeline.</p>
          </div>
          <ul className="space-y-3 lg:col-span-5 lg:col-start-8">
            {points.map((p) => <li key={p} className="soft-card flex gap-3 p-4 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden="true" />{p}</li>)}
          </ul>
        </div>
      </Section>

      <Section tone="soft" labelledBy="services-title">
        <SectionHeading id="services-title" eyebrow="What we do" title={`Interior services in ${l.name}`} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <li key={s.href}><Link href={s.href} className="soft-card block h-full p-5 transition-colors hover:border-wine"><p className="ui-title text-lg">{s.title}</p><p className="mt-1 text-sm text-graphite">{s.body}</p></Link></li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="near-title">
        <SectionHeading id="near-title" eyebrow="Nearby" title="We also work in" />
        <ul className="flex flex-wrap gap-2">
          {nearby(l, 12).map((n) => <li key={n.slug}><Link href={`/interior-designer/${n.slug}`} className="block rounded-full border border-stone-deep px-4 py-2 text-sm hover:border-wine hover:text-wine">Interior Designer in {n.name}</Link></li>)}
        </ul>
        <div className="red-panel mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl p-8 text-paper md:flex-row md:items-center">
          <div><h2 className="text-[clamp(1.6rem,2.6vw,2.2rem)]">Planning interiors in {l.name}?</h2><p className="mt-1 text-paper/85">Get an indicative budget in minutes — free, no obligation.</p></div>
          <Button href="/estimate" size="lg" variant="light">Get Free Estimate <Arrow /></Button>
        </div>
      </Section>
    </>
  );
}
