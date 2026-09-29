import { ProjectDetail } from '@/features/account/Projects';

export const metadata = { title: 'Project' };
export default async function Page({ params }) { const { id } = await params; return <ProjectDetail id={id} />; }
