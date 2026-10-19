import { getPartners } from '@/lib/server-api';

/** Brand partner logos scrolling in a loop above the footer. Hidden until logos are added in Admin. */
export default async function PartnersStrip() {
  const items = await getPartners();
  if (!items.length) return null;
  // Repeat short lists so the strip is always wider than the screen, then duplicate once for a seamless loop.
  const base = Array.from({ length: Math.max(1, Math.ceil(10 / items.length)) }, () => items).flat();
  const Logo = ({ p, hidden }) => {
    const img = <img src={p.logo} alt={hidden ? '' : p.name} loading="lazy" className="h-19 w-auto max-w-[150px] object-contain transition duration-300 group-hover/logo:opacity-100 group-hover/logo:grayscale-0 sm:h-27" />;
    return (
      <li className="group/logo flex shrink-0 items-center px-6 sm:px-10" aria-hidden={hidden || undefined}>
        {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" tabIndex={hidden ? -1 : undefined} title={p.name}>{img}</a> : img}
      </li>
    );
  };
  return (
    <section aria-labelledby="partners-title" className="border-t border-stone bg-paper py-10 sm:py-12">
      <div className="container-x">
        <div className="text-center"><p id="partners-title" className="eyebrow">Our brand partners</p></div>
        <p className="mt-2 text-center text-sm text-graphite">Materials and fittings from brands you can trust</p>
      </div>
      <div className="marquee group mt-7 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <ul className="marquee-track flex w-max items-center">
          {base.map((p, i) => <Logo key={`a${i}`} p={p} />)}
          {base.map((p, i) => <Logo key={`b${i}`} p={p} hidden />)}
        </ul>
      </div>
    </section>
  );
}
