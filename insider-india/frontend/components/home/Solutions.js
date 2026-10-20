import Link from 'next/link';
import Image from 'next/image';
import Swatch from '@/components/ui/Swatch';
import { Section, SectionHeading } from '@/components/ui/Section';
import { SOLUTIONS, IMAGES } from '@/lib/content';

const imageKey = { '/interiors': 'interiors', '/kitchen': 'kitchen', '/wardrobes': 'wardrobes', '/renovation': 'renovation', '/commercial-interiors': 'commercial' };

// An index of drawings: each row turns solid red on hover, like a sheet being selected in a set.
export default function Solutions() {
  return (
    <Section labelledBy="solutions-title">
      <SectionHeading id="solutions-title" title="Explore our interior solutions" intro="Start with the whole home or a single room. Every project follows the same measured, itemised process." />
      <ul className="border-t-2 border-wine">
        {SOLUTIONS.map((s) => {
          const img = IMAGES[imageKey[s.href]];
          return (
            <li key={s.href} className="border-b border-stone-deep">
              <Link href={s.href} className="group grid items-center gap-5 py-6 transition-colors hover:bg-wine hover:text-paper sm:grid-cols-12 sm:gap-8 sm:px-4">
                <div className="relative aspect-[4/3] w-full overflow-hidden border border-stone-deep group-hover:border-paper sm:col-span-3 lg:col-span-2">
                  {img ? <Image src={img} alt="" fill sizes="(min-width:1024px) 16vw, (min-width:640px) 25vw, 100vw" className="object-cover" />
                    : <Swatch tone={s.tone} className="absolute inset-0 bg-paper" />}
                </div>
                <h3 className="text-d3 sm:col-span-5 lg:col-span-5">{s.title}</h3>
                <p className="text-graphite group-hover:text-paper/90 sm:col-span-3 lg:col-span-4">{s.body}</p>
                <span aria-hidden="true" className="hidden justify-self-end sm:col-span-1 sm:flex">
                  <span className="relative block h-0.5 w-10 bg-current after:absolute after:-right-px after:-top-[5px] after:size-3 after:rotate-45 after:border-r-2 after:border-t-2 after:border-current" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
