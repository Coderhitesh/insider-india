import QuotationEditor from '@/features/admin/QuotationEditor';

export const metadata = { title: 'Quotation' };
export default async function Page({ params }) { const { id } = await params; return <QuotationEditor id={id} />; }
