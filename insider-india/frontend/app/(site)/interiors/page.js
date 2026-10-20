import ServicePage, { serviceMetadata } from '@/components/pages/ServicePage';

export const revalidate = 300;
export const metadata = serviceMetadata('interiors');

export default function Page() {
  return <ServicePage pageKey="interiors" />;
}
