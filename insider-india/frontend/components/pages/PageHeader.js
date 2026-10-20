import Link from 'next/link';
import Image from 'next/image';
import JsonLd from '@/components/ui/JsonLd';
import { breadcrumbLd } from '@/lib/seo';

// Inner-page hero in the home-page language: warm wash, eyebrow, serif title, optional photo with a curved edge.
export default function PageHeader({ title, lede, crumbs = [], children, eyebrow, image, imageAlt = '' }) {
  const trail = [{ name: 'Home', path: '/' }, ...crumbs];
  return (
    <header className="hero-wash relative overflow-hidden border-b border-stone">
      <div className={image ? 'grid lg:grid-cols-[minmax(0,52fr)_minmax(0,48fr)]' : ''}>
        <div className={image ? 'flex items-center' : ''}>
          <div className={image ? 'w-full px-5 py-12 sm:px-10 sm:py-16 lg:ml-auto lg:max-w-[700px] lg:py-20 lg:pl-12 lg:pr-10 xl:pl-6' : 'container-x py-12 sm:py-16 lg:py-20'}>
            {crumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="mb-6 text-xs text-graphite">
                <ol className="flex flex-wrap items-center gap-1.5">
                  {trail.map((c, i) => (
                    <li key={c.path} className="flex items-center gap-1.5">
                      {i > 0 && <span aria-hidden="true" className="text-mist">›</span>}
                      {i === trail.length - 1 ? <span aria-current="page" className="font-medium text-wine">{c.name}</span> : <Link href={c.path} className="hover:text-wine">{c.name}</Link>}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <p className="eyebrow">{eyebrow || 'Insider India LLP'}</p>
            <div className={image ? '' : 'grid gap-6 lg:grid-cols-12 lg:items-end'}>
              <h1 className={`mt-3 text-[clamp(2.3rem,4.6vw,3.9rem)] leading-[1.02] ${image ? '' : 'lg:col-span-7'}`}>{title}</h1>
              {lede && <p className={`max-w-xl text-[1.02rem] leading-relaxed text-graphite ${image ? 'mt-5' : 'lg:col-span-5 lg:pb-2'}`}>{lede}</p>}
            </div>
            {children}
          </div>
        </div>
        {image && (
          <div className="relative min-h-64 sm:min-h-80 lg:min-h-[440px]">
            <Image src={image} alt={imageAlt} fill priority quality={90} sizes="(min-width:1024px) 48vw, 100vw" className="object-cover" />
            <svg aria-hidden="true" viewBox="0 0 120 600" preserveAspectRatio="none" className="absolute inset-y-0 -left-px hidden h-full w-20 text-[#fffaf9] lg:block">
              <path fill="currentColor" d="M0 0h70C30 140 20 300 60 430c18 60 40 120 60 170H0z" />
            </svg>
          </div>
        )}
      </div>
      {crumbs.length > 0 && <JsonLd data={breadcrumbLd(trail)} />}
    </header>
  );
}
