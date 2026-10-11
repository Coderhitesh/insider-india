import Hero from '@/components/home/Hero';
import Solutions from '@/components/home/Solutions';
import HowItWorks from '@/components/home/HowItWorks';
import PackageBoards from '@/components/home/PackageBoards';
import Benefits from '@/components/home/Benefits';
import Testimonials from '@/components/home/Testimonials';
import Faq from '@/components/home/Faq';
import ProjectCard from '@/components/home/ProjectCard';
import ConsultationForm from '@/components/home/ConsultationForm';
import Button from '@/components/ui/Button';
import { Section, SectionHeading } from '@/components/ui/Section';
import { getSite, getPackages, getProjects, getTestimonials, getFaqs } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
const HOME_TITLE = 'INSIDER INDIA LLP — Interiors designed around the way you live';
export const metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description: 'Full home interiors, modular kitchens, wardrobes and renovation. Get an indicative budget in minutes; your final quotation follows a site visit and measurements.',
    path: '/',
  }),
  title: { absolute: HOME_TITLE },
};

export default async function Home() {
  const [{ stats }, packages, projects, testimonials, faqs] = await Promise.all([
    getSite(), getPackages(), getProjects({ featured: true, limit: 6 }), getTestimonials(), getFaqs(),
  ]);

  return (
    <>
      <Hero stats={stats} />

      {projects.items.length > 0 && (
        <Section labelledBy="projects-title">
          <SectionHeading id="projects-title" title="Recent projects" intro="Homes and spaces we have designed and delivered." />
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {projects.items.slice(0, 6).map((p, i) => <li key={p.id}><ProjectCard project={p} priority={i < 3} /></li>)}
          </ul>
          <Button href="/projects" variant="link" className="mt-10">See all projects</Button>
        </Section>
      )}

      <Solutions />
      <HowItWorks />

      <Section tone="red" labelledBy="packages-title" className="grid-paper-invert">
        <SectionHeading id="packages-title" title="Four packages, one honest process" intro="Choose the finish level that suits you. Compare what each package includes, then get a range for your home." />
        <PackageBoards packages={packages} inverse />
        <Button href="/packages" variant="link" className="mt-8 !text-paper decoration-paper">Compare packages in detail</Button>
      </Section>

      <section aria-labelledby="calc-title" className="border-y-2 border-wine bg-paper">
        <div className="ruler h-3.5 text-wine" aria-hidden="true" />
        <div className="container-x grid items-center gap-8 py-16 sm:py-20 lg:grid-cols-12">
          <h2 id="calc-title" className="text-d1 text-wine lg:col-span-7">Calculate my interior budget</h2>
          <div className="lg:col-span-5">
            <p className="text-lg text-graphite">Five quick questions about your home, then an indicative range for each package. Free, and you can book a consultation straight from the result.</p>
            <Button href="/estimate" size="lg" className="mt-6">Start the calculator</Button>
          </div>
        </div>
      </section>

      <Benefits />
      <Testimonials items={testimonials} />
      <Faq items={faqs} />

      <Section tone="blush" labelledBy="consult-title">
        <div className="grid gap-10 border-2 border-wine bg-paper p-6 sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="consult-title" className="text-d2">Talk to a designer</h2>
            <p className="mt-4 text-graphite">Tell us who you are and we will take you through a few questions about your home. It takes about three minutes.</p>
          </div>
          <div className="lg:col-span-8"><ConsultationForm id="home-cta" /></div>
        </div>
      </Section>
    </>
  );
}
