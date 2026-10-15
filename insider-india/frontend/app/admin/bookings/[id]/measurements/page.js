import MeasurementSheet from '@/features/admin/Measurements';

export const metadata = { title: 'Measurements' };
export default async function Page({ params }) { const { id } = await params; return <MeasurementSheet bookingId={id} />; }
