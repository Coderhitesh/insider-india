import Image from 'next/image';
import PageHeader from './PageHeader';
import Button from '@/components/ui/Button';
import Swatch from '@/components/ui/Swatch';
import JsonLd from '@/components/ui/JsonLd';
import ProjectCard from '@/components/home/ProjectCard';
import ConsultationForm from '@/components/home/ConsultationForm';
import { Section, SectionHeading } from '@/components/ui/Section';
import { SERVICE_PAGES, IMAGES } from '@/lib/content';
import { getProjects, getSite } from '@/lib/server-api';
import { serviceLd, pageMetadata } from '@/lib/seo';

export const serviceMetadata = (key) => {
  const s = SERVICE_PAGES[key];
  return pageMetadata({ title: s.metaTitle, description: s.lede, path: s.path });
};

export default async function ServicePage({ pageKey }) {
  const s = SERVICE_PAGES[pageKey];
  const [{ company }, projects] = await Promise.all([getSite(), getProjects({ category: s.category, limit: 3 })]);
  const img = IMAGES[s.image];
  return (
    <>
      <PageHeader title={s.title} lede={s.lede} crumbs={[{ name: s.title, path: s.path }]}>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button href="/estimate" size="lg">Get free estimate</Button>
          <Button href="/book-consultation" size="lg" variant="secondary">Book a consultation</Button>
        </div>
      </PageHeader>

      <Section labelledBy="includes-title">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="relative min-h-80 overflow-hidden rounded-[3px] lg:col-span-6">
            {img ? <Image src={img} alt={s.title} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /> : <Swatch tone={s.tone} className="absolute inset-0" label />}
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 id="includes-title" className="text-d3">What is included</h2>
            <ul className="mt-6 divide-y divide-stone border-y border-stone">
              {s.includes.map((x) => <li key={x} className="py-3.5">{x}</li>)}
            </ul>
            <p className="mt-4 text-sm text-graphite">Your quotation lists exactly what is included for your home, item by item.</p>
          </div>
        </div>
      </Section>

      <Section tone="paper" labelledBy="approach-title">
        <SectionHeading id="approach-title" title="How we approach it" />
        <dl className="grid gap-10 md:grid-cols-3">
          {s.points.map((p) => (
            <div key={p.title} className="border-t border-charcoal pt-5">
              <dt className="text-lg font-semibold">{p.title}</dt>
              <dd className="mt-2 text-graphite">{p.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {projects.items.length > 0 && (
        <Section labelledBy="work-title">
          <SectionHeading id="work-title" title="Related projects" />
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{projects.items.map((p) => <li key={p.id}><ProjectCard project={p} /></li>)}</ul>
        </Section>
      )}

      <Section tone="stone" labelledBy="svc-cta">
        <div className="grid gap-10 lg:grid-cols-12">
          <h2 id="svc-cta" className="text-d2 lg:col-span-4">Start with a conversation</h2>
          <div className="lg:col-span-8"><ConsultationForm id={`svc-${pageKey}`} /></div>
        </div>
      </Section>
      <JsonLd data={serviceLd({ name: s.title, description: s.lede, path: s.path, company })} />
    </>
  );
}
