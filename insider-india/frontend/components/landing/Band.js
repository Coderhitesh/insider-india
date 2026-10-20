import Image from 'next/image';
import { Sofa, Gem, Users, Clock3 } from 'lucide-react';
import { HOME_IMG, Eyebrow } from './media';

const POINTS = [
  { icon: Sofa, label: 'Personalised design approach' },
  { icon: Gem, label: 'Premium quality materials' },
  { icon: Users, label: 'End-to-end project management' },
  { icon: Clock3, label: 'On-time delivery & transparent process' },
];

export default function Band() {
  return (
    <section aria-labelledby="band-title" className="relative overflow-hidden">
      <div className="grid lg:grid-cols-2">
        <div className="relative aspect-[16/9] lg:aspect-auto lg:min-h-[400px]">
          <Image src={HOME_IMG.band} alt="Dining area with pendant lights and a long wooden table" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
        </div>
        <div className="red-panel relative z-10 -mt-10 rounded-t-[48px] px-6 py-12 text-paper sm:px-12 lg:-ml-[12%] lg:mt-0 lg:rounded-l-[200px] lg:rounded-tr-none lg:py-16 lg:pl-[16%] lg:pr-12 xl:pr-20">
          <Eyebrow light>More than interiors</Eyebrow>
          <h2 id="band-title" className="mt-3 text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.05]">Spaces that inspire a better everyday life.</h2>
          <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-paper/85">We design thoughtful, liveable spaces that reflect your personality, improve the way you live, and stand the test of time.</p>
          <ul className="mt-9 grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-white/20">
            {POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="pr-4 sm:px-4 sm:first:pl-0">
                <Icon className="size-7" strokeWidth={1.4} aria-hidden="true" />
                <p className="mt-3 text-[0.8rem] leading-snug text-paper/90">{label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
