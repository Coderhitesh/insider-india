import Image from 'next/image';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/pages/PageHeader';
import ProjectCard from '@/components/home/ProjectCard';
import Button from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { getProject } from '@/lib/server-api';
import { PROJECT_CATEGORIES } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/format';

export const revalidate = 600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getProject(slug);
  if (!data) return { title: 'Project not found', robots: { index: false } };
  const p = data.project;
  return pageMetadata({ title: p.seo?.title || p.title, description: p.seo?.description || p.summary || `${p.title} by INSIDER INDIA LLP`, path: `/project/${slug}`, images: p.coverImage ? [{ url: p.coverImage }] : undefined });
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const data = await getProject(slug);
  if (!data) notFound();
  const { project: p, related } = data;
  const cat = PROJECT_CATEGORIES.find((c) => c.value === p.category)?.label;
  const facts = [['Type', cat], ['Configuration', p.bhk], ['Area', p.area && `${p.area.toLocaleString('en-IN')} sq ft`], ['Location', [p.locality, p.city].filter(Boolean).join(', ')], ['Package', p.packageName], ['Completed', formatDate(p.completedOn)]].filter(([, v]) => v);
  const before = p.images.filter((i) => i.kind === 'BEFORE');
  const after = p.images.filter((i) => i.kind === 'AFTER');
  const gallery = p.images.filter((i) => i.kind === 'GALLERY');

  return (
    <>
      <PageHeader title={p.title} lede={p.summary} crumbs={[{ name: 'Projects', path: '/projects' }, { name: p.title, path: `/project/${p.slug}` }]} />
      {p.coverImage && (
        <div className="container-x pt-10"><div className="relative aspect-[16/9] overflow-hidden rounded-none"><Image src={p.coverImage} alt={p.title} fill priority sizes="100vw" className="object-cover" /></div></div>
      )}
      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <dl className="grid h-max grid-cols-2 gap-6 lg:col-span-4 lg:grid-cols-1">
            {facts.map(([k, v]) => <div key={k} className="border-t border-stone pt-3"><dt className="text-sm text-graphite">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>)}
          </dl>
          {p.description && <div className="measure whitespace-pre-line text-lg lg:col-span-7 lg:col-start-6">{p.description}</div>}
        </div>
        {(before.length > 0 && after.length > 0) && (
          <div className="mt-20">
            <h2 className="text-d3">Before and after</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[['Before', before[0]], ['After', after[0]]].map(([label, img]) => (
                <figure key={label}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-none"><Image src={img.url} alt={img.alt || `${p.title} — ${label.toLowerCase()}`} fill sizes="(min-width:640px) 50vw, 100vw" className="object-cover" /></div>
                  <figcaption className="mt-2 text-sm text-graphite">{label}{img.caption ? `: ${img.caption}` : ''}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
        {gallery.length > 0 && (
          <ul className="mt-20 grid gap-4 sm:grid-cols-2">
            {gallery.map((img, i) => (
              <li key={img.url} className={i % 3 === 0 ? 'sm:col-span-2' : ''}>
                <figure>
                  <div className={`relative overflow-hidden rounded-none ${i % 3 === 0 ? 'aspect-[16/9]' : 'aspect-[4/5]'}`}><Image src={img.url} alt={img.alt || p.title} fill sizes={i % 3 === 0 ? '100vw' : '50vw'} className="object-cover" loading="lazy" /></div>
                  {img.caption && <figcaption className="mt-2 text-sm text-graphite">{img.caption}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-16 flex flex-col gap-3 sm:flex-row">
          <Button href="/book-consultation" size="lg">Plan a home like this</Button>
          <Button href="/estimate" size="lg" variant="secondary">Get free estimate</Button>
        </div>
      </Section>
      {related?.length > 0 && (
        <Section tone="paper">
          <h2 className="text-d3">More {cat?.toLowerCase()} projects</h2>
          <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <li key={r.id}><ProjectCard project={r} /></li>)}</ul>
        </Section>
      )}
    </>
  );
}
