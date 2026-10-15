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
import BrandSlider from '@/components/landing/BrandSlider';
import { getSite, getPackages, getProjects, getTestimonials, getFaqs, getServices, getBrands } from '@/lib/server-api';
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
    { key: 'visit', value: 'Free', label: 'Design consultation' },
    packages.length > 0 && { key: 'pk', value: String(packages.length), label: 'Interior packages' },
    warranty > 0 && { key: 'w', value: `${warranty} yrs`, label: 'Warranty, up to' },
    { key: 'q', value: '100%', label: 'Item-wise quotation' },
  ].filter(Boolean);
  const hasWarranty = stats.some((s) => /warrant/i.test(s.label));
  return [...stats, ...facts.filter((f) => !(hasWarranty && f.key === 'w'))].slice(0, 4);
}

export default async function Home() {
  const [{ stats, company }, packages, projects, testimonials, faqs, services, brands] = await Promise.all([
    getSite(), getPackages(), getProjects({ featured: true, limit: 6 }), getTestimonials(), getFaqs(), getServices(), getBrands(),
  ]);

  return (
    <>
      <Hero stats={heroStats(stats, packages)} />
      <BrandSlider items={brands} />
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
