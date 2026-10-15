import Image from 'next/image';
import Button from '@/components/ui/Button';
import { IMAGES } from '@/lib/content';

const W = { fill: 'none', stroke: 'currentColor', vectorEffect: 'non-scaling-stroke', strokeLinecap: 'square', strokeLinejoin: 'miter' };
const L = { fill: 'currentColor', fontFamily: 'var(--font-archivo), sans-serif' };

function Line({ d, w = 1.5, len = 1400, delay = 0, dash }) {
  return <path d={d} {...W} strokeWidth={w} className={dash ? undefined : 'draw-line'} strokeDasharray={dash} style={dash ? { animation: `fade-in .5s ${delay + 900}ms both` } : { '--len': len, animationDelay: `${delay}ms` }} />;
}
function Label({ x, y, children, delay = 1100, size = 13, weight = 600 }) {
  return <text x={x} y={y} {...L} fontSize={size} fontWeight={weight} className="fade-late" style={{ animationDelay: `${delay}ms` }}>{children}</text>;
}

// The one orchestrated moment: a 3 BHK plan drawn in red, then labelled and dimensioned.
function HeroPlan() {
  return (
    <svg viewBox="0 0 572 440" className="h-auto w-full text-wine" role="img" aria-label="Line drawing of a three-bedroom apartment plan with room dimensions">
      <Line d="M40 40H520V400H40Z" w={4} len={1700} />
      <Line d="M40 220H250M250 40V400M250 250H520M400 40V250M400 150H520M140 220V400" w={2.4} len={1600} delay={250} />
      <Line d="M250 300a40 40 0 0 1 40 -40" dash="3 5" delay={200} />
      <Line d="M140 260a36 36 0 0 0 36 -36" dash="3 5" delay={250} />
      <Line d="M400 200a34 34 0 0 1 34 34" dash="3 5" delay={300} />
      {/* furniture */}
      <Line d="M290 290h150v34H326v50h-36z" w={1.2} len={700} delay={700} />
      <Line d="M300 100h70v50h-70z M430 60h70v70h-70z M60 60h90v110H60z M268 60h110v18" w={1.2} len={900} delay={800} />
      <Line d="M60 240h60v40H60z M160 360h70v24h-70z" w={1.2} len={600} delay={850} />
      {/* dimension lines */}
      <g className="fade-late" style={{ animationDelay: '1200ms' }}>
        <path d="M40 22H520M40 14v16M520 14v16M250 16v12" {...W} strokeWidth={1} />
        <path d="M540 40V400M532 40h16M532 400h16" {...W} strokeWidth={1} />
      </g>
      <Label x={128} y={16} size={11} weight={500}>5,400</Label>
      <Label x={368} y={16} size={11} weight={500}>6,200</Label>
      <text x={551} y={204} {...L} fontSize={11} fontWeight={500} className="fade-late" style={{ animationDelay: '1200ms' }} transform="rotate(90 551 204)">8,400</text>
      <Label x={70} y={200}>Bedroom 1</Label>
      <Label x={272} y={210}>Living &amp; dining</Label>
      <Label x={414} y={180}>Kitchen</Label>
      <Label x={414} y={112} size={11}>Utility</Label>
      <Label x={160} y={320}>Bedroom 2</Label>
      <Label x={56} y={320}>Bath</Label>
      <Label x={300} y={386} size={11} weight={500}>Balcony</Label>
    </svg>
  );
}

export default function Hero({ stats }) {
  return (
    <section aria-labelledby="hero-title" className="grid-paper border-b-2 border-wine">
      <div className="container-x grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:gap-10 lg:py-24">
        <div className="lg:col-span-7">
          <div aria-hidden="true" className="hero-rise mb-8 flex items-center text-wine">
            <span className="h-4 w-0.5 bg-current" /><span className="h-0.5 w-24 bg-current" /><span className="h-4 w-0.5 bg-current" />
            <span className="ml-3 text-xs font-semibold tracking-[0.14em]">INSIDER INDIA LLP</span>
          </div>
          <h1 id="hero-title" className="hero-rise text-d1">Interiors designed around the way you live.</h1>
          <p className="hero-rise measure mt-7 text-lg text-graphite sm:text-xl" style={{ animationDelay: '100ms' }}>
            Full homes, kitchens and wardrobes. See an indicative budget in minutes; get a room-by-room quotation once we have measured your home.
          </p>
          <div className="hero-rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '180ms' }}>
            <Button href="/estimate" size="lg">Get free estimate</Button>
            <Button href="/book-consultation" size="lg" variant="secondary">Book a consultation</Button>
          </div>
        </div>
        <div className="lg:col-span-5">
          {IMAGES.hero ? (
            <div className="relative aspect-[4/3] border-2 border-wine p-2">
              <div className="relative size-full"><Image src={IMAGES.hero} alt="Interior designed by INSIDER INDIA LLP" fill priority sizes="(min-width:1024px) 45vw, 90vw" className="object-cover" /></div>
            </div>
          ) : <HeroPlan />}
        </div>
      </div>
      {stats.length > 0 && (
        <div className="bg-wine text-paper">
          <div className="ruler h-3.5 text-paper/60" aria-hidden="true" />
          <dl className="container-x grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.key}>
                <dd className="font-display text-2xl">{s.value}</dd>
                <dt className="mt-1 text-sm text-paper/80">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
