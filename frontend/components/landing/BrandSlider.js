import { Eyebrow } from './media';

// Brand partner logos from Admin → Website content → Brand partners. Hidden when none are published.
function Logo({ b }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={b.logo} alt={b.name} loading="lazy" className="h-10 w-auto max-w-[9rem] object-contain transition duration-30 sm:h-22" />
  );
  return b.website
    ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="group flex shrink-0 items-center px-8 sm:px-12" aria-label={b.name}>{img}</a>
    : <div className="group flex shrink-0 items-center px-8 sm:px-12">{img}</div>;
}

export default function BrandSlider({ items = [] }) {
  if (!items.length) return null;
  // Repeat short lists so the track always overfills the screen, then duplicate once for a seamless loop.
  const base = items.length >= 8 ? items : Array.from({ length: Math.ceil(8 / items.length) }, () => items).flat();
  const seconds = Math.max(25, base.length * 4);
  return (
    <section aria-label="Our brand partners" className="border-y border-stone/60 bg-paper py-8 sm:py-10">
      <div className="container-x mb-6 text-center"><Eyebrow>Our brand partners</Eyebrow></div>
      <div className="brand-marquee overflow-hidden" style={{ '--marquee-time': `${seconds}s` }}>
        <div className="brand-track flex w-max items-center">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? 'true' : undefined}>
              {base.map((b, i) => <Logo key={`${b.id}-${i}`} b={b} />)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
