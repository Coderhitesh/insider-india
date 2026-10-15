import { CustomerDetail } from '@/features/admin/People';

export const metadata = { title: 'Customer' };
export default async function Page({ params }) { const { id } = await params; return <CustomerDetail id={id} />; }
