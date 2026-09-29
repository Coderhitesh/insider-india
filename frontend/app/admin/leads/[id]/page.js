import { LeadDetail } from '@/features/admin/Leads';

export const metadata = { title: 'Lead' };
export default async function Page({ params }) { const { id } = await params; return <LeadDetail id={id} />; }
