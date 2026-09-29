import PageHeader from '@/components/pages/PageHeader';
import HowItWorks from '@/components/home/HowItWorks';
import Faq from '@/components/home/Faq';
import Button from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { getFaqs } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'How it works', description: 'From your first requirement to handover: estimate, site visit, measurements, itemised quotation, approval, execution.', path: '/how-it-works' });

export default async function HowItWorksPage() {
  const faqs = await getFaqs('PROCESS');
  return (
    <>
      <PageHeader title="How it works" lede="Two ways in — an instant estimate or a direct booking — and one process after that." crumbs={[{ name: 'How it works', path: '/how-it-works' }]} />
      <HowItWorks />
      <Section labelledBy="estimate-vs-quote">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="border-t border-charcoal pt-6">
            <h2 id="estimate-vs-quote" className="text-d3">The estimate</h2>
            <p className="mt-4 text-graphite">An indicative range based on your home size, rooms, add-ons and package. It is useful for planning and comparing packages. It is not a final price.</p>
            <Button href="/estimate" variant="link" className="mt-4">Calculate my budget</Button>
          </div>
          <div className="border-t border-charcoal pt-6">
            <h2 className="text-d3">The quotation</h2>
            <p className="mt-4 text-graphite">Prepared only after a site visit and measurements. It lists every item with material, finish, dimensions, quantity and rate, and is reviewed by our team before you receive it.</p>
            <Button href="/book-consultation" variant="link" className="mt-4">Book a site visit</Button>
          </div>
        </div>
      </Section>
      <Faq items={faqs} title="About the process" />
    </>
  );
}
