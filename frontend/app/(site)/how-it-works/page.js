import { Calculator, FileText } from 'lucide-react';
import PageHeader from '@/components/pages/PageHeader';
import HowItWorks from '@/components/home/HowItWorks';
import Faq from '@/components/landing/Faq';
import CalcBanner from '@/components/landing/CalcBanner';
import Button from '@/components/ui/Button';
import { Arrow } from '@/components/landing/media';
import { Section, SectionHeading } from '@/components/ui/Section';
import { getFaqs } from '@/lib/server-api';
import { IMAGES } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'How it works', description: 'From your first requirement to handover: estimate, site visit, measurements, itemised quotation, approval, execution.', path: '/how-it-works' });

export default async function HowItWorksPage() {
  const faqs = await getFaqs('PROCESS');
  return (
    <>
      <PageHeader eyebrow="Our process" title="How it works" lede="Two ways in — an instant estimate or a direct booking — and one transparent process after that."
        crumbs={[{ name: 'How it works', path: '/how-it-works' }]} image={IMAGES.kitchen} imageAlt="Modular kitchen">
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/estimate" size="lg" className="h-13 px-7">Get Free Estimate <Arrow /></Button>
          <Button href="/book-consultation" size="lg" variant="secondary" className="h-13 border-[1.5px] bg-paper px-7">Book a Consultation <Arrow /></Button>
        </div>
      </PageHeader>
      <HowItWorks />
      <Section labelledBy="estimate-vs-quote">
        <SectionHeading id="estimate-vs-quote" eyebrow="Good to know" title="Estimate vs quotation" />
        <div className="grid gap-5 lg:grid-cols-2">
          {[
            { icon: Calculator, title: 'The estimate', body: 'An indicative range based on your home size, rooms, add-ons and package. It is useful for planning and comparing packages. It is not a final price.', href: '/estimate', cta: 'Calculate my budget' },
            { icon: FileText, title: 'The quotation', body: 'Prepared only after a site visit and measurements. It lists every item with material, finish, dimensions, quantity and rate, and is reviewed by our team before you receive it.', href: '/book-consultation', cta: 'Book a site visit' },
          ].map(({ icon: Icon, title, body, href, cta }) => (
            <div key={title} className="soft-card flex gap-5 p-6 sm:p-8">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blush"><Icon className="size-6 text-wine" strokeWidth={1.4} aria-hidden="true" /></span>
              <div>
                <h3 className="text-[1.6rem] leading-tight">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-graphite">{body}</p>
                <Button href={href} variant="link" className="mt-4 text-sm">{cta}</Button>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div className="pb-6"><CalcBanner /></div>
      <Faq items={faqs} />
    </>
  );
}
