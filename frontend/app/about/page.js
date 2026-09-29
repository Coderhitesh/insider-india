import Image from 'next/image';
import PageHeader from '@/components/pages/PageHeader';
import Benefits from '@/components/home/Benefits';
import Button from '@/components/ui/Button';
import Swatch from '@/components/ui/Swatch';
import { Section } from '@/components/ui/Section';
import { IMAGES } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'About us', description: 'INSIDER INDIA LLP designs and builds interiors with measured, itemised quotations and structured project tracking.', path: '/about' });

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About INSIDER INDIA LLP" lede="We design and build homes the way we would want ours done: measured properly, priced openly, tracked from start to finish." crumbs={[{ name: 'About', path: '/about' }]} />
      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="relative min-h-96 overflow-hidden rounded-[3px] lg:col-span-5">
            {IMAGES.about ? <Image src={IMAGES.about} alt="The INSIDER INDIA LLP team at work" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" /> : (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2">
                <Swatch tone="oak" className="col-span-2 row-span-3" /><Swatch tone="wine" /><Swatch tone="sand" /><Swatch tone="brass" />
              </div>
            )}
          </div>
          <div className="measure space-y-6 text-lg lg:col-span-6 lg:col-start-7">
            <p>Most interior projects go wrong in the gap between the first quote and the finished room. Prices drift, scope changes quietly, and nobody can say what stage the work is at.</p>
            <p>We built our process to close that gap. You can see an indicative budget before you commit to anything. Your quotation is prepared only after we have measured your home, and it lists every item with its material, finish, dimensions and rate.</p>
            <p>Once you approve, your project moves through clear stages — design, material selection, production, site execution, quality check and handover — and you can follow each one in your dashboard.</p>
            <Button href="/book-consultation" size="lg" className="mt-4">Book a consultation</Button>
          </div>
        </div>
      </Section>
      <Benefits />
    </>
  );
}
