import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';
import Swatch from '@/components/ui/Swatch';
import { Section, SectionHeading } from '@/components/ui/Section';
import { SOLUTIONS, IMAGES } from '@/lib/content';

const imageKey = { '/interiors': 'interiors', '/kitchen': 'kitchen', '/wardrobes': 'wardrobes', '/renovation': 'renovation', '/commercial-interiors': 'commercial' };

export default function Solutions() {
  return (
    <Section labelledBy="solutions-title">
      <SectionHeading id="solutions-title" title="Explore our interior solutions" intro="Start with the whole home or a single room. Every project follows the same measured, itemised process." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
        {SOLUTIONS.map((s, i) => {
          const img = IMAGES[imageKey[s.href]];
          return (
            <li key={s.href} className={clsx(i === 0 ? 'lg:col-span-3 lg:row-span-2' : i < 3 ? 'lg:col-span-3' : 'lg:col-span-3 xl:col-span-3')}>
              <Link href={s.href} className="group relative flex h-full min-h-56 flex-col justify-end overflow-hidden rounded-[3px]">
                {img ? <Image src={img} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                  : <Swatch tone={s.tone} className="absolute inset-0" />}
                <span className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/25 to-transparent" aria-hidden="true" />
                <span className="relative p-6 text-paper sm:p-8">
                  <span className={clsx('block font-display', i === 0 ? 'text-d3' : 'text-2xl')}>{s.title}</span>
                  <span className="mt-2 block max-w-sm text-sm text-paper/85">{s.body}</span>
                  <span className="mt-4 inline-block text-sm underline decoration-brass underline-offset-4">Explore {s.title.toLowerCase()}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
