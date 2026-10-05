import localFont from 'next/font/local';
import './globals.css';
import Providers from '@/components/providers/Providers';
import JsonLd from '@/components/ui/JsonLd';
import { getSite } from '@/lib/server-api';
import { localBusinessLd } from '@/lib/seo';
import { SITE_URL } from '@/lib/config';

// Archivo variable (weight 100–900, width 62–125%) — one family; headings use its expanded width.
const archivo = localFont({ src: '../public/fonts/Archivo.woff2', variable: '--font-archivo', weight: '100 900', style: 'normal', display: 'swap', declarations: [{ prop: 'font-stretch', value: '62% 125%' }] });

export async function generateMetadata() {
  const { company } = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${company.name} — Interior design & home interiors`, template: `%s | ${company.name}` },
    description: 'Full home interiors, modular kitchens, wardrobes and renovation. Get an indicative budget in minutes, then a measured, item-by-item quotation after a site visit.',
    applicationName: company.name,
    icons: company.faviconUrl ? { icon: company.faviconUrl } : undefined,
    formatDetection: { telephone: false },
  };
}

export const viewport = { themeColor: '#c8102e', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  const { company } = await getSite();
  return (
    <html lang="en-IN" className={archivo.variable}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
        <Providers>{children}</Providers>
        <JsonLd data={localBusinessLd(company)} />
      </body>
    </html>
  );
}
