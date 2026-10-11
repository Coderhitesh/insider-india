import Link from 'next/link';
import JsonLd from '@/components/ui/JsonLd';
import { breadcrumbLd } from '@/lib/seo';

export default function PageHeader({ title, lede, crumbs = [], children }) {
  const trail = [{ name: 'Home', path: '/' }, ...crumbs];
  return (
    <header className="grid-paper border-b-2 border-wine">
      <div className="container-x py-14 sm:py-20">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-graphite">
            <ol className="flex flex-wrap gap-2">
              {trail.map((c, i) => (
                <li key={c.path} className="flex gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i === trail.length - 1 ? <span aria-current="page" className="font-semibold text-wine">{c.name}</span> : <Link href={c.path} className="hover:text-wine">{c.name}</Link>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div aria-hidden="true" className="mb-6 flex items-center text-wine"><span className="h-4 w-0.5 bg-current" /><span className="h-0.5 w-20 bg-current" /><span className="h-4 w-0.5 bg-current" /></div>
        <div className="grid gap-8 lg:grid-cols-12">
          <h1 className="text-d1 lg:col-span-8">{title}</h1>
          {lede && <p className="measure self-end text-lg text-graphite lg:col-span-4">{lede}</p>}
        </div>
        {children}
      </div>
      {crumbs.length > 0 && <JsonLd data={breadcrumbLd(trail)} />}
    </header>
  );
}
