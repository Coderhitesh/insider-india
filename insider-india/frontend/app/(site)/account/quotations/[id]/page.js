import { QuotationDetail } from '@/features/account/Quotations';

export const metadata = { title: 'Quotation' };
export default async function Page({ params }) { const { id } = await params; return <QuotationDetail id={id} />; }
