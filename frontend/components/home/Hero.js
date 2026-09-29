import Image from 'next/image';
import Button from '@/components/ui/Button';
import Swatch from '@/components/ui/Swatch';
import { IMAGES } from '@/lib/content';

// The one orchestrated moment on the site: the material board assembles on load.
function MaterialBoard() {
  const d = (ms) => ({ animationDelay: `${ms}ms` });
  return (
    <div className="relative grid h-full min-h-[26rem] grid-cols-6 grid-rows-6 gap-2 sm:gap-3" aria-hidden={!IMAGES.hero}>
      <div className="hero-unveil col-span-4 row-span-6 overflow-hidden" style={d(150)}>
        {IMAGES.hero ? (
          <Image src={IMAGES.hero} alt="Living room designed by INSIDER INDIA LLP" fill priority sizes="(min-width:1024px) 34vw, 70vw" className="object-cover" />
        ) : (
          <Swatch tone="oak" className="h-full" label />
        )}
      </div>
      <Swatch tone="wine" className="hero-unveil col-span-2 row-span-3" label />
      <Swatch tone="sand" className="hero-unveil col-span-2 row-span-2" label />
      <Swatch tone="brass" className="hero-unveil col-span-2 row-span-1" label />
    </div>
  );
}

export default function Hero({ stats }) {
  return (
    <section aria-labelledby="hero-title" className="border-b border-stone">
      <div className="container-x grid gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-24">
        <div className="flex flex-col justify-center lg:col-span-7">
          <h1 id="hero-title" className="hero-rise text-d1">Interiors designed around the way you live.</h1>
          <p className="hero-rise measure mt-7 text-lg text-graphite sm:text-xl" style={{ animationDelay: '120ms' }}>
            INSIDER INDIA LLP designs and builds full homes, kitchens and wardrobes. Start with an indicative budget in a few minutes;
            your final quotation is prepared room by room after we measure your home.
          </p>
          <div className="hero-rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '220ms' }}>
            <Button href="/estimate" size="lg">Get free estimate</Button>
            <Button href="/book-consultation" size="lg" variant="secondary">Book a consultation</Button>
          </div>
          {stats.length > 0 && (
            <dl className="hero-rise mt-14 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-stone pt-8 sm:grid-cols-4" style={{ animationDelay: '320ms' }}>
              {stats.map((s) => (
                <div key={s.key}>
                  <dt className="text-sm text-graphite">{s.label}</dt>
                  <dd className="mt-1 whitespace-nowrap font-display text-2xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="lg:col-span-5"><MaterialBoard /></div>
      </div>
    </section>
  );
}
