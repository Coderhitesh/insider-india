import Link from 'next/link';
import Image from 'next/image';
import { HOME_IMG, LandingHeading, ArrowCircle } from './media';

function Tile({ href, src, title, sub, priority }) {
  return (
    <Link href={href} className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-stone sm:aspect-[5/4] lg:aspect-[4/3.2]">
      <Image src={src} alt="" fill priority={priority} sizes="(min-width:1024px) 19vw, (min-width:640px) 45vw, 92vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-paper">
        <span>
          <span className="block text-[0.9rem] font-semibold leading-tight">{title}</span>
          {sub && <span className="block text-xs text-paper/80">{sub}</span>}
        </span>
        <ArrowCircle light className="size-7" />
      </span>
    </Link>
  );
}

// Featured projects from Admin. Until projects are published, shows space categories instead.
export default function Spaces({ projects = [] }) {
  const real = projects.filter((p) => p.coverImage).slice(0, 5);
  return (
    <section aria-labelledby="spaces-title" className="bg-blush/70 py-14 sm:py-16">
      <div className="container-x">
        <LandingHeading id="spaces-title" eyebrow="Our work" title={real.length ? 'Beautiful spaces, real stories' : 'Beautiful spaces, made for living'}
          link={{ href: '/projects', label: 'View all projects' }} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 [&>li:last-child:nth-child(odd)]:col-span-2 lg:[&>li:last-child:nth-child(odd)]:col-span-1">
          {real.length
            ? real.map((p, i) => <li key={p.id}><Tile href={`/project/${p.slug}`} src={p.coverImage} title={p.title} sub={p.city} priority={i < 2} /></li>)
            : HOME_IMG.spaces.map((s) => <li key={s.src}><Tile href={`/projects?category=${s.category}`} src={s.src} title={s.label} /></li>)}
        </ul>
      </div>
    </section>
  );
}
