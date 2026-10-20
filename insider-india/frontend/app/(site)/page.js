import Hero from '@/components/landing/Hero';
import Solutions from '@/components/landing/Solutions';
import Band from '@/components/landing/Band';
import Process from '@/components/landing/Process';
import Spaces from '@/components/landing/Spaces';
import Packages from '@/components/landing/Packages';
import CalcBanner from '@/components/landing/CalcBanner';
import WhyUs from '@/components/landing/WhyUs';
import Reviews from '@/components/landing/Reviews';
import Faq from '@/components/landing/Faq';
import { getSite, getPackages, getProjects, getTestimonials, getFaqs, getServices } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 60;
const HOME_TITLE = 'INSIDER INDIA LLP — Interiors designed around the way you live';
export const metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description: 'Full home interiors, modular kitchens, wardrobes and renovation. Get an indicative budget in minutes; your final quotation follows a site visit and measurements.',
    path: '/',
  }),
  title: { absolute: HOME_TITLE },
};

// Stats come from Admin → Settings. Until they are filled in, show facts the system itself knows.
function heroStats(stats, packages) {
  if (stats.length >= 3) return stats;
  const warranty = Math.max(0, ...packages.map((p) => p.warranty?.years || 0));
  const facts = [
    { key: 'handover', value: '45 Days', label: 'Handover guaranteed, otherwise we pay ₹1,000/day' },
    { key: 'designers', value: '500+', label: 'Designers' },
    warranty > 0 && { key: 'w', value: `${warranty} yrs`, label: 'Warranty, up to' },
    { key: 'q', value: '100%', label: 'Item-wise quotation' },
  ].filter(Boolean);
  const has = (rx) => stats.some((s) => rx.test(s.label));
  const skip = { w: /warrant/i, handover: /handover/i, designers: /designer/i, q: /quotation/i };
  return [...stats, ...facts.filter((f) => !(skip[f.key] && has(skip[f.key])))].slice(0, 4);
}

export default async function Home() {
  const [{ stats, company, hero }, packages, projects, testimonials, faqs, services] = await Promise.all([
    getSite(), getPackages(), getProjects({ featured: true, limit: 6 }), getTestimonials(), getFaqs(), getServices(),
  ]);

  return (
    <>
      <Hero stats={heroStats(stats, packages)} hero={hero} />
      <Solutions services={services} />
      <Band />
      <Process />
      <Spaces projects={projects.items} />
      <Packages packages={packages} />
      <CalcBanner />
      <WhyUs companyName={company.name} />
      <Reviews items={testimonials} />
      <Faq items={faqs} />
    </>
  );
}
