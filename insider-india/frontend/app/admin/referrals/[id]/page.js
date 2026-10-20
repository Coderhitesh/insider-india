import { ReferralDetail } from '@/features/admin/Referrals';

export const metadata = { title: 'Referral' };
export default async function Page({ params }) { const { id } = await params; return <ReferralDetail id={id} />; }
