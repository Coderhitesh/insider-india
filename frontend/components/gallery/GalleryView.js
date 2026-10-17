import PageHeader from '@/components/pages/PageHeader';
import Button from '@/components/ui/Button';
import { Arrow } from '@/components/landing/media';
import { Section } from '@/components/ui/Section';
import { IMAGES } from '@/lib/content';
import GalleryTabs from './GalleryTabs';

/** Shared by /gallery (all) and /gallery/[slug] (one category). */
export default function GalleryView({ gallery, slug = '' }) {
  const cat = gallery.categories.find((c) => c.slug === slug);
  const items = slug ? gallery.items.filter((x) => x.category === slug) : gallery.items;
  const crumbs = [{ name: 'Gallery', path: '/gallery' }, ...(cat ? [{ name: cat.name, path: `/gallery/${cat.slug}` }] : [])];

  return (
    <>
      <PageHeader eyebrow="Gallery" crumbs={crumbs} image={cat?.coverImage || items[0]?.image || IMAGES.hero} imageAlt={cat ? `${cat.name} interiors` : 'Interiors by INSIDER INDIA'}
        title={cat ? <>{cat.name} <span className="text-wine">designs</span></> : <>Ideas for every <span className="text-wine">room</span></>}
        lede={cat?.description || 'Browse real spaces by category — full homes, modular kitchens, bedrooms, wardrobes and more. Like something? Get an estimate for a space like it.'}>
        <div className="mt-8"><Button href="/estimate" size="lg" className="h-13 px-7">Get Free Estimate <Arrow /></Button></div>
      </PageHeader>
      <Section>
        <GalleryTabs gallery={gallery} initial={slug} />
      </Section>
      <Section tone="soft">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-[clamp(1.8rem,3vw,2.4rem)]">Want a space like this?</h2>
            <p className="mt-2 max-w-xl text-graphite">Get an indicative budget in minutes, then a detailed item-wise quotation after a free site visit.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/estimate" size="lg">Get Free Estimate</Button>
            <Button href="/book-consultation" size="lg" variant="secondary">Book a Consultation</Button>
          </div>
        </div>
      </Section>
    </>
  );
}
