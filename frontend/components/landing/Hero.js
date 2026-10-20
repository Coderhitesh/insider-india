import Link from 'next/link';
import Button from '@/components/ui/Button';
import { HOME_IMG, Eyebrow, Arrow } from './media';
import HeroSlider from './HeroSlider';
import RotatingHeadline from './RotatingHeadline';

// Built-in photos, used until images are added in Admin → Settings → Home banner.
const TOP_FALLBACK = [{ src: HOME_IMG.hero, alt: 'A warm living room with a sectional sofa and marble coffee table' }];
const BOTTOM_FALLBACK = [{ src: HOME_IMG.band, alt: 'Dining area with pendant lights and a long wooden table' }];
const toSlides = (list, fallback) => (list?.length ? list.map((x) => ({ src: x.image, alt: x.alt || 'Interior designed by INSIDER INDIA LLP' })) : fallback);

// Light botanical sprig, drawn in grey behind the headline.
function Sprig({ className }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 300" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M20 300C60 220 80 140 140 10" />
      {[[40, 250, -1], [52, 220, 1], [62, 190, -1], [75, 160, 1], [86, 130, -1], [98, 100, 1], [112, 70, -1], [124, 42, 1]].map(([x, y, d], i) => (
        <path key={i} d={`M${x} ${y}c${d * 30} -6 ${d * 44} -22 ${d * 48} -40c${d * -20} 2 ${d * -40} 16 ${d * -48} 40z`} fill="currentColor" fillOpacity=".35" />
      ))}
    </svg>
  );
}

export default function Hero({ stats, hero = {} }) {
  const ms = Math.max(2, Number(hero.intervalSeconds) || 5) * 1000;
  return (
    <section aria-labelledby="hero-title" className="hero-wash relative overflow-hidden">
      <Sprig className="pointer-events-none absolute -left-6 top-10 hidden w-40 text-[#c9c5bc] opacity-70 lg:block" />
      <div className="grid lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)]">
        <div className="relative z-10 flex items-center">
          <div className="w-full px-5 py-12 sm:px-10 sm:py-16 lg:ml-auto lg:max-w-[640px] lg:py-20 lg:pl-12 lg:pr-4 xl:pl-6">
            <Eyebrow className="hero-rise">Interiors that belong</Eyebrow>
            <RotatingHeadline id="hero-title" items={hero.headlines} seconds={hero.headlineSeconds || 5} className="hero-rise mt-4 text-[clamp(2.5rem,5.2vw,4.6rem)] leading-[1.02]" />
            <p className="hero-rise mt-6 max-w-lg text-[1.05rem] leading-relaxed text-graphite" style={{ animationDelay: '100ms' }}>
              Beautiful, functional and personalised interiors for homes, kitchens, wardrobes and workspaces — planned around your budget.
            </p>
            <div className="hero-rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '180ms' }}>
              <Button href="/estimate" size="lg" className="h-13 px-7">Get Free Estimate <Arrow /></Button>
              <Button href="/book-consultation" size="lg" variant="secondary" className="h-13 border-[1.5px] bg-paper px-7">Book a Consultation <Arrow /></Button>
            </div>
            {stats.length > 0 && (
              <dl className="hero-rise mt-10 grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-stone" style={{ animationDelay: '260ms' }}>
                {stats.slice(0, 4).map((s) => (
                  <div key={s.key || s.label} className="flex flex-col-reverse justify-end sm:px-4 sm:first:pl-0">
                    <dt className="mt-0.5 text-xs text-graphite">{s.label}</dt>
                    <dd className="text-[1.4rem] font-semibold leading-tight text-wine">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="relative [container-type:inline-size] lg:self-stretch">
          <div className="relative grid w-full gap-1 lg:h-full lg:min-h-[520px] lg:grid-rows-2">
            <HeroSlider slides={toSlides(hero.top, TOP_FALLBACK)} interval={ms} priority className="aspect-[16/9] lg:aspect-auto" />
            <HeroSlider slides={toSlides(hero.bottom, BOTTOM_FALLBACK)} interval={ms + 1000} className="aspect-[16/9] lg:aspect-auto" />

            {/* soft wave where the photo meets the text column */}
            <svg aria-hidden="true" viewBox="0 0 120 600" preserveAspectRatio="none" className="absolute inset-y-0 -left-px hidden h-full w-24 text-[#fff8f6] lg:block">
              <path fill="currentColor" d="M0 0h70C30 140 20 300 60 430c18 60 40 120 60 170H0z" />
            </svg>
            <Link href="/how-it-works" className="group absolute bottom-[8%] right-[4%] flex w-[min(260px,46%)] items-center justify-between gap-3 rounded-xl bg-white/95 p-3.5 shadow-[0_10px_30px_-12px_rgb(0_0_0/.35)] backdrop-blur sm:p-4">
              <span className="text-[clamp(0.72rem,1.5cqw,0.92rem)] font-medium leading-snug text-charcoal">Turn your space into a home you love</span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wine text-paper transition-transform group-hover:scale-105"><Arrow /></span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}