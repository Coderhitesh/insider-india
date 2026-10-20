import Link from 'next/link';
import Image from 'next/image';
import { Sofa, CookingPot, DoorOpen, Hammer, Building2 } from 'lucide-react';
import { SOLUTIONS } from '@/lib/content';
import { HOME_IMG, LandingHeading, ArrowCircle } from './media';

const ICON = { '/interiors': Sofa, '/kitchen': CookingPot, '/wardrobes': DoorOpen, '/renovation': Hammer, '/commercial-interiors': Building2 };
const BODY = {
  '/interiors': 'Complete interiors tailored to your lifestyle.',
  '/kitchen': 'Stylish & functional kitchens for modern living.',
  '/wardrobes': 'Smart storage solutions for organised spaces.',
  '/renovation': 'Civil work and interiors under one plan.',
  '/commercial-interiors': 'Offices, studios and retail spaces.',
};

export default function Solutions({ services = [] }) {
  // Admin service images (matched by page slug) override the default photos.
  const adminImg = (href) => services.find((s) => s.image && href.includes(s.slug))?.image;
  return (
    <section aria-labelledby="solutions-title" className="py-14 sm:py-20">
      <div className="container-x">
        <LandingHeading id="solutions-title" eyebrow="Our solutions" title="Explore interior solutions"
          intro="From complete home interiors to modular kitchens and commercial spaces, we create spaces that are beautiful, functional and truly yours."
          link={{ href: '/services', label: 'View all solutions' }} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {SOLUTIONS.map((s) => {
            const Icon = ICON[s.href];
            const src = adminImg(s.href) || HOME_IMG.solutions[s.href];
            return (
              <li key={s.href}>
                <Link href={s.href} className="soft-card group flex h-full flex-col p-2.5 transition-shadow hover:shadow-[0_14px_34px_-14px_rgb(154_12_34/.3)]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                    <Image src={src} alt="" fill sizes="(min-width:1024px) 18vw, (min-width:768px) 30vw, (min-width:480px) 45vw, 92vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    {/* notch carrying the icon */}
                    <span className="absolute -bottom-px -left-px flex size-11 items-center justify-center rounded-tr-[18px] sm:size-14 sm:rounded-tr-[22px] bg-white">
                      <Icon className="size-6 text-wine" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex flex-1 items-end justify-between gap-3 px-2 pb-2 pt-3">
                    <div>
                      <h3 className="ui-title text-[1.02rem]">{s.title}</h3>
                      <p className="mt-1.5 text-[0.8rem] leading-snug text-graphite">{BODY[s.href] || s.body}</p>
                    </div>
                    <ArrowCircle className="hidden sm:flex" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
