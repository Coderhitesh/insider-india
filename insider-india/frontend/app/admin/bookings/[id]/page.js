import { BookingDetail } from '@/features/admin/Bookings';

export const metadata = { title: 'Booking' };
export default async function Page({ params }) { const { id } = await params; return <BookingDetail id={id} />; }
