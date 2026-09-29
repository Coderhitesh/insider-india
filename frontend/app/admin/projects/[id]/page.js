import { ExecutionDetail } from '@/features/admin/Execution';

export const metadata = { title: 'Project' };
export default async function Page({ params }) { const { id } = await params; return <ExecutionDetail id={id} />; }
