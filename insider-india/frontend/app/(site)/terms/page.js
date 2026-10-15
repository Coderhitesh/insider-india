import LegalPage from '@/components/pages/LegalPage';
import { getSite } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;
export const metadata = pageMetadata({ title: 'Terms of use', description: 'Terms that apply to using the INSIDER INDIA LLP website and customer dashboard.', path: '/terms' });

// Uses the terms configured in Admin > Settings > Company when present.
export default async function TermsPage() {
  const { company } = await getSite();
  return (
    <LegalPage title="Terms of use" path="/terms" custom={company.terms}>
      <p>By using this website and customer dashboard you agree to these terms.</p>
      <h2>Estimates are indicative</h2>
      <p>Budget estimates shown on this website are indicative and based on the information you provide. Final pricing is prepared only after an expert site visit, actual measurements, material selection and scope verification.</p>
      <h2>Quotations</h2>
      <p>Quotations are valid for the period stated on them. A project begins only after you accept a quotation and the terms printed on it.</p>
      <h2>Your account</h2>
      <p>You are responsible for keeping access to your registered mobile number secure. Verification codes must not be shared.</p>
      <h2>Content</h2>
      <p>Designs, images and documents on this website belong to {company.name} or their respective owners and may not be reused without permission.</p>
    </LegalPage>
  );
}
