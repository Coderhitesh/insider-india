import Link from 'next/link';

// Default home-page photography (public/images/home). Replace any file with a high-resolution
// photo of the same name, or set images in Admin (services, packages, projects) — admin images win.
// `?v=` changes when any file in public/images changes (see next.config.mjs), so replaced photos show at once.
export const img = (path) => `${path}?v=${process.env.NEXT_PUBLIC_IMG_V || '1'}`;

export const HOME_IMG = {
  hero: img('/images/home/hero-living.jpg'),
  band: img('/images/home/band-dining.jpg'),
  calc: img('/images/home/calc.jpg'),
  review: img('/images/home/review.jpg'),
  solutions: {
    '/interiors': img('/images/home/sol-interiors.jpg'),
    '/kitchen': img('/images/home/sol-kitchen.jpg'),
    '/wardrobes': img('/images/home/sol-wardrobes.jpg'),
    '/renovation': img('/images/home/sol-renovation.jpg'),
    '/commercial-interiors': img('/images/home/sol-commercial.jpg'),
  },
  spaces: [
    { src: img('/images/home/proj-1.jpg'), label: 'Full home interiors', category: 'FULL_HOME' },
    { src: img('/images/home/proj-2.jpg'), label: 'Modular kitchens', category: 'MODULAR_KITCHEN' },
    { src: img('/images/home/proj-3.jpg'), label: 'Bedrooms', category: 'BEDROOM' },
    { src: img('/images/home/proj-4.jpg'), label: 'Wardrobes & walk-ins', category: 'WARDROBE' },
    { src: img('/images/home/proj-5.jpg'), label: 'Commercial interiors', category: 'COMMERCIAL' },
  ],
  // wide crops for landscape package cards
  packagesWide: [img('/images/home/sol-interiors.jpg'), img('/images/home/proj-2.jpg'), img('/images/home/proj-3.jpg'), img('/images/home/proj-1.jpg')],
  packages: [img('/images/home/pkg-1.jpg'), img('/images/home/pkg-2.jpg'), img('/images/home/pkg-3.jpg'), img('/images/home/pkg-4.jpg')],
};

export function Eyebrow({ children, className = '', light = false }) {
  return <p className={`eyebrow ${light ? '!text-paper/85' : ''} ${className}`}>{children}</p>;
}

export function ArrowCircle({ className = '', light = false }) {
  return (
    <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${light ? 'border-white/60 bg-white text-wine' : 'border-stone text-wine group-hover:border-wine group-hover:bg-wine group-hover:text-paper'} ${className}`}>
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" /></svg>
    </span>
  );
}

export const Arrow = ({ className = 'size-4' }) => (
  <svg aria-hidden="true" viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" /></svg>
);

// Section header row: eyebrow + serif title on the left, short intro + link on the right.
export function LandingHeading({ id, eyebrow, title, intro, link }) {
  return (
    <div className="mb-8 grid gap-5 lg:mb-10 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="mt-2 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.08]">{title}</h2>
      </div>
      {(intro || link) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8 lg:col-span-6 lg:pl-8">
          {intro && <p className="max-w-md text-sm leading-relaxed text-graphite">{intro}</p>}
          {link && <Link href={link.href} className="inline-flex shrink-0 items-center gap-1.5 border-b border-wine pb-0.5 text-sm font-medium text-wine hover:text-wine-deep">{link.label}<Arrow className="size-3.5" /></Link>}
        </div>
      )}
    </div>
  );
}
