import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getSite } from '@/lib/server-api';

export default async function SiteLayout({ children }) {
  const { company } = await getSite();
  return (
    <>
      <Header company={company} />
      <main id="main" className="flex-1">{children}</main>
      <Footer company={company} />
    </>
  );
}
