import Link from 'next/link';
import clsx from 'clsx';
import PageHeader from '@/components/pages/PageHeader';
import ProjectCard from '@/components/home/ProjectCard';
import Button from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { getProjects } from '@/lib/server-api';
import { PROJECT_CATEGORIES } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'Projects', description: 'Full homes, kitchens, bedrooms, wardrobes, renovations and commercial spaces designed by INSIDER INDIA LLP.', path: '/projects' });

export default async function ProjectsPage({ searchParams }) {
  const sp = await searchParams;
  const category = PROJECT_CATEGORIES.some((c) => c.value === sp?.category) ? sp.category : '';
  const page = Math.max(1, parseInt(sp?.page, 10) || 1);
  const { items } = await getProjects({ category, page, limit: 12 });

  return (
    <>
      <PageHeader title="Projects" lede="A selection of homes and spaces we have designed and delivered." crumbs={[{ name: 'Projects', path: '/projects' }]} />
      <Section>
        <nav aria-label="Filter projects" className="mb-12 flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((c) => (
            <Link key={c.value || 'all'} href={c.value ? `/projects?category=${c.value}` : '/projects'} aria-current={category === c.value ? 'page' : undefined}
              className={clsx('rounded-full border px-4 py-2 text-sm transition-colors', category === c.value ? 'border-charcoal bg-charcoal text-paper' : 'border-stone-deep hover:border-charcoal')}>
              {c.label}
            </Link>
          ))}
        </nav>
        {items.length ? (
          <>
            <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{items.map((p, i) => <li key={p.id}><ProjectCard project={p} priority={i < 3} /></li>)}</ul>
            <div className="mt-14 flex justify-between">
              {page > 1 ? <Button variant="secondary" href={`/projects?${new URLSearchParams({ ...(category && { category }), page: String(page - 1) })}`}>Previous</Button> : <span />}
              {items.length === 12 && <Button variant="secondary" href={`/projects?${new URLSearchParams({ ...(category && { category }), page: String(page + 1) })}`}>Next</Button>}
            </div>
          </>
        ) : (
          <div className="max-w-xl border-t border-stone pt-8">
            <p className="text-xl">No projects published in this category yet.</p>
            <p className="mt-2 text-graphite">Book a consultation and our designer will walk you through relevant work during your visit.</p>
            <Button href="/book-consultation" className="mt-6">Book a consultation</Button>
          </div>
        )}
      </Section>
    </>
  );
}
