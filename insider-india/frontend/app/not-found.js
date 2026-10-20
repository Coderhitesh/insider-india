import Button from '@/components/ui/Button';
import Swatch from '@/components/ui/Swatch';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container-x grid min-h-[70vh] items-center gap-12 py-20 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <p className="tabular font-display text-6xl text-wine">404</p>
        <h1 className="mt-4 text-d2">This page isn&apos;t here</h1>
        <p className="mt-4 max-w-md text-lg text-graphite">The link may be old or mistyped. Start from the home page, or go straight to the budget calculator.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/" size="lg">Go to home page</Button>
          <Button href="/estimate" size="lg" variant="secondary">Calculate my budget</Button>
        </div>
      </div>
      <div className="hidden h-72 grid-cols-4 gap-2 lg:col-span-4 lg:col-start-9 lg:grid" aria-hidden="true">
        <Swatch tone="stone" className="col-span-2" /><Swatch tone="wine" /><Swatch tone="brass" /><Swatch tone="oak" className="col-span-4" />
      </div>
    </div>
  );
}
