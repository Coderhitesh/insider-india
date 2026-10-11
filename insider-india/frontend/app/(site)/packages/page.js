import PageHeader from '@/components/pages/PageHeader';
import PackageBoards from '@/components/home/PackageBoards';
import Button from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { getPackages } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';
import { formatShort } from '@/lib/format';

export const revalidate = 300;
export const metadata = pageMetadata({ title: 'Interior packages & pricing', description: 'Compare Economical, Premium Elegance, Luxer Silver and Luxer Gold packages with indicative ranges by home size.', path: '/packages' });

const BHK_LABEL = { '1BHK': '1 BHK', '2BHK': '2 BHK', '3BHK': '3 BHK', '4BHK': '4 BHK', '5BHK_PLUS': '5 BHK+' };

export default async function PackagesPage() {
  const packages = await getPackages();
  const bhks = Object.keys(BHK_LABEL).filter((b) => packages.some((p) => p.pricing.some((x) => x.bhk === b)));
  const allFeatures = [...new Set(packages.flatMap((p) => p.features))];

  return (
    <>
      <PageHeader title="Packages" lede="Each package sets the level of design, materials, hardware and warranty. Your quotation confirms exactly what goes into your home." crumbs={[{ name: 'Packages', path: '/packages' }]} />
      <Section labelledBy="boards-title">
        <h2 id="boards-title" className="sr-only">Package overview</h2>
        <PackageBoards packages={packages} full />
      </Section>

      {packages.length > 0 && (
        <Section tone="paper" labelledBy="compare-title">
          <h2 id="compare-title" className="text-d2">Compare side by side</h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
              <caption className="sr-only">Package comparison: indicative ranges and inclusions</caption>
              <thead>
                <tr className="border-b border-charcoal">
                  <th scope="col" className="w-1/5 py-4 pr-4 font-medium text-graphite">&nbsp;</th>
                  {packages.map((p) => <th key={p.id} scope="col" className="py-4 pr-4 font-display text-xl font-medium">{p.name}</th>)}
                </tr>
              </thead>
              <tbody className="tabular">
                {bhks.map((b) => (
                  <tr key={b} className="border-b border-stone">
                    <th scope="row" className="py-3.5 pr-4 font-medium">{BHK_LABEL[b]}</th>
                    {packages.map((p) => {
                      const r = p.pricing.find((x) => x.bhk === b);
                      return <td key={p.id} className="py-3.5 pr-4">{r ? `${formatShort(r.min)} – ${formatShort(r.max)}` : <span className="text-graphite">On request</span>}</td>;
                    })}
                  </tr>
                ))}
                <tr className="border-b border-stone">
                  <th scope="row" className="py-3.5 pr-4 font-medium">Warranty</th>
                  {packages.map((p) => <td key={p.id} className="py-3.5 pr-4">{p.warranty?.years ? `${p.warranty.years} years` : <span className="text-graphite">As per quotation</span>}</td>)}
                </tr>
                {allFeatures.map((f) => (
                  <tr key={f} className="border-b border-stone">
                    <th scope="row" className="py-3 pr-4 font-normal text-graphite">{f}</th>
                    {packages.map((p) => <td key={p.id} className="py-3 pr-4">{p.features.includes(f) ? <span aria-label="Included">●</span> : <span className="text-stone-deep" aria-label="Not listed">—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/estimate" size="lg">Get a range for my home</Button>
            <Button href="/book-consultation" size="lg" variant="secondary">Book a consultation</Button>
          </div>
        </Section>
      )}
    </>
  );
}
