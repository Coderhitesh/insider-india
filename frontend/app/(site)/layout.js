import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PartnersStrip from '@/components/layout/PartnersStrip';
import WhatsAppFab from '@/components/layout/WhatsAppFab';
import Reveal from '@/components/layout/Reveal';
import { getSite } from '@/lib/server-api';

export default async function SiteLayout({ children }) {
  const { company } = await getSite();
  return (
    <div className="site-skin flex flex-1 flex-col">
      <Header company={company} />
      <main id="main" className="flex-1">{children}</main>
      <PartnersStrip />
      <Footer company={company} />
      <WhatsAppFab number={company.whatsapp || company.phone} />
      <Reveal />
    </div>
  );
}
