import LegalPage from '@/components/pages/LegalPage';
import { getSite } from '@/lib/server-api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;
export const metadata = pageMetadata({ title: 'Privacy policy', description: 'How INSIDER INDIA LLP collects, uses and protects your information.', path: '/privacy-policy' });

// Standard policy describing what this platform actually collects. Have it reviewed by your legal advisor.
export default async function PrivacyPage() {
  const { company } = await getSite();
  return (
    <LegalPage title="Privacy policy" path="/privacy-policy">
      <p>This policy explains what information {company.name} collects when you use this website and customer dashboard, and how it is used.</p>
      <h2>Information we collect</h2>
      <ul>
        <li>Contact details you provide: name, mobile number, email and city.</li>
        <li>Property details: address, pincode, property type, configuration and your interior requirements.</li>
        <li>Files you upload, such as floor plans, and photographs and measurements recorded during a site visit.</li>
        <li>Technical information such as device type, pages visited and campaign parameters used to reach the site.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To verify your mobile number and give you access to your dashboard.</li>
        <li>To prepare estimates, schedule site visits and prepare quotations.</li>
        <li>To send updates about your booking, quotation and project by WhatsApp, SMS, email or in-app notification.</li>
        <li>To improve our services and maintain the security of the platform.</li>
      </ul>
      <h2>Sharing</h2>
      <p>Your details are shared only with the experts and contractors assigned to your project, and with service providers that help us run the platform (hosting, messaging and file storage), under appropriate safeguards. We do not sell your personal information.</p>
      <h2>Your choices</h2>
      <p>You can ask us to correct or delete your personal information{company.email ? <> by writing to <a href={`mailto:${company.email}`} className="underline">{company.email}</a></> : ' by contacting us'}. Some records related to quotations and projects may be retained where required by law.</p>
      <h2>Security</h2>
      <p>Verification codes are stored in hashed form, sessions use secure cookies, and uploaded documents are stored privately and shared only through time-limited links.</p>
    </LegalPage>
  );
}
