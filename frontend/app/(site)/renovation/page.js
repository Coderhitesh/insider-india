import ServicePage, { serviceMetadata } from '@/components/pages/ServicePage';

export const revalidate = 300;
export const metadata = serviceMetadata('renovation');

export default function Page() {
  return <ServicePage pageKey="renovation" />;
}
