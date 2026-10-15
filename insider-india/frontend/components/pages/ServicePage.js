import Image from 'next/image';
import { Check } from 'lucide-react';
import PageHeader from './PageHeader';
import Button from '@/components/ui/Button';
import JsonLd from '@/components/ui/JsonLd';
import ProjectCard from '@/components/home/ProjectCard';
import ConsultationForm from '@/components/home/ConsultationForm';
import CalcBanner from '@/components/landing/CalcBanner';
import Process from '@/components/landing/Process';
import { Arrow } from '@/components/landing/media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { SERVICE_PAGES, IMAGES, IMAGES_ALT } from '@/lib/content';
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
  const img2 = IMAGES_ALT[s.image] || img;
  return (
    <>
      <PageHeader eyebrow="Our solutions" title={s.title} lede={s.lede} crumbs={[{ name: 'Services', path: '/services' }, { name: s.title, path: s.path }]} image={img} imageAlt={s.title}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/estimate" size="lg" className="h-13 px-7">Get Free Estimate <Arrow /></Button>
          <Button href="/book-consultation" size="lg" variant="secondary" className="h-13 border-[1.5px] bg-paper px-7">Book a Consultation <Arrow /></Button>
        </div>
      </PageHeader>

      <Section labelledBy="includes-title">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:col-span-6">
            {img2 && <Image src={img2} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />}
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <p className="eyebrow">Scope</p>
            <h2 id="includes-title" className="mt-2 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.08]">What is included</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {s.includes.map((x) => (
                <li key={x} className="soft-card flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blush"><Check className="size-3.5 text-wine" aria-hidden="true" /></span>{x}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-graphite">Your quotation lists exactly what is included for your home, item by item.</p>
          </div>
        </div>
      </Section>

      <Section tone="soft" labelledBy="approach-title">
        <SectionHeading id="approach-title" eyebrow="Our approach" title="How we approach it" />
        <ul className="grid gap-5 md:grid-cols-3">
          {s.points.map((p, i) => (
            <li key={p.title} className="soft-card p-6">
              <span className="text-xl font-semibold text-wine">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="ui-title mt-2 text-lg">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Process />

      {projects.items.length > 0 && (
        <Section tone="blush" labelledBy="work-title">
          <SectionHeading id="work-title" eyebrow="Our work" title="Related projects" />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{projects.items.map((p) => <li key={p.id}><ProjectCard project={p} /></li>)}</ul>
        </Section>
      )}

      <CalcBanner />

      <Section labelledBy="svc-cta">
        <div className="grid gap-8 rounded-2xl border-2 border-wine/70 p-6 sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Talk to a designer</p>
            <h2 id="svc-cta" className="mt-2 text-[clamp(1.8rem,3vw,2.4rem)] leading-tight">Start with a conversation</h2>
            <p className="mt-3 text-sm text-graphite">Tell us who you are and we will take you through a few questions about your home.</p>
          </div>
          <div className="lg:col-span-8"><ConsultationForm id={`svc-${pageKey}`} /></div>
        </div>
      </Section>
      <JsonLd data={serviceLd({ name: s.title, description: s.lede, path: s.path, company })} />
    </>
  );
}
