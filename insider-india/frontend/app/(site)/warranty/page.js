import PageHeader from '@/components/pages/PageHeader';
import Button from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { getPackages, getSite } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'Warranty', description: 'Warranty cover by package, and how warranty is documented at handover.', path: '/warranty' });

export default async function WarrantyPage() {
  const [{ company }, packages] = await Promise.all([getSite(), getPackages()]);
  return (
    <>
      <PageHeader title="Warranty" lede="Warranty cover depends on the package you choose and is confirmed in your quotation and handover documents." crumbs={[{ name: 'Warranty', path: '/warranty' }]} />
      <Section>
        {packages.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p) => (
              <li key={p.id} className="border-t border-charcoal pt-5">
                <p className="font-display text-2xl">{p.name}</p>
                <p className="mt-2 text-graphite">{p.warranty?.years ? `${p.warranty.years}-year warranty cover plan` : 'Warranty as specified in your quotation'}</p>
              </li>
            ))}
          </ul>
        )}
        {company.warrantyContent
          ? <div className="measure mt-16 whitespace-pre-line text-lg">{company.warrantyContent}</div>
          : <p className="measure mt-16 text-lg text-graphite">Detailed warranty terms — what is covered, for how long, and how to raise a request — are included in your quotation and handed over with your project documents.</p>}
        <Button href="/packages" variant="secondary" className="mt-10">Compare packages</Button>
      </Section>
    </>
  );
}
