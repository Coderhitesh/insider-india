import Image from 'next/image';
import PageHeader from '@/components/pages/PageHeader';
import WhyUs from '@/components/landing/WhyUs';
import Band from '@/components/landing/Band';
import Button from '@/components/ui/Button';
import { Arrow } from '@/components/landing/media';
import { Section } from '@/components/ui/Section';
import { IMAGES } from '@/lib/content';
import { getSite } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'About us', description: 'INSIDER INDIA LLP designs and builds interiors with measured, itemised quotations and structured project tracking.', path: '/about' });

export default async function AboutPage() {
  const { company } = await getSite();
  return (
    <>
      <PageHeader eyebrow="About us" title="Interiors that belong to the people who live in them" lede="We design and build homes the way we would want ours done: measured properly, priced openly, tracked from start to finish."
        crumbs={[{ name: 'About', path: '/about' }]} image={IMAGES.about} imageAlt="Living room designed by INSIDER INDIA LLP" />
      <Section labelledBy="story-title">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:col-span-5">
            <Image src={IMAGES.review} alt="" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
          </div>
          <div className="space-y-5 text-[1.02rem] leading-relaxed text-graphite lg:col-span-6 lg:col-start-7">
            <p className="eyebrow">Our story</p>
            <h2 id="story-title" className="text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.08] text-charcoal">Closing the gap between the quote and the finished room</h2>
            <p>Most interior projects go wrong in the gap between the first quote and the finished room. Prices drift, scope changes quietly, and nobody can say what stage the work is at.</p>
            <p>We built our process to close that gap. You can see an indicative budget before you commit to anything. Your quotation is prepared only after we have measured your home, and it lists every item with its material, finish, dimensions and rate.</p>
            <p>Once you approve, your project moves through clear stages — design, material selection, production, site execution, quality check and handover — and you can follow each one in your dashboard.</p>
            <Button href="/book-consultation" size="lg" className="mt-2 h-13 px-7">Book a Consultation <Arrow /></Button>
          </div>
        </div>
      </Section>
      <Band />
      <WhyUs companyName={company.name} />
    </>
  );
}
