import localFont from 'next/font/local';
import './globals.css';
import Providers from '@/components/providers/Providers';
import JsonLd from '@/components/ui/JsonLd';
import { getSite } from '@/lib/server-api';
import { localBusinessLd } from '@/lib/seo';
import { SITE_URL } from '@/lib/config';

const bodoni = localFont({ src: '../public/fonts/BodoniModa.woff2', variable: '--font-bodoni', weight: '400 900', display: 'swap' });
const hanken = localFont({ src: '../public/fonts/HankenGrotesk.woff2', variable: '--font-hanken', weight: '100 900', display: 'swap' });

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

export const viewport = { themeColor: '#f3eee6', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  const { company } = await getSite();
  return (
    <html lang="en-IN" className={`${bodoni.variable} ${hanken.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-paper focus:px-4 focus:py-2">Skip to content</a>
        <Providers>{children}</Providers>
        <JsonLd data={localBusinessLd(company)} />
      </body>
    </html>
  );
}
