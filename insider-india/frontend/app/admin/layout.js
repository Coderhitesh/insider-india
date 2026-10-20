import { Suspense } from 'react';
import AdminShell from '@/components/admin/AdminShell';

export const metadata = { title: { default: 'Console', template: '%s | INSIDER INDIA Console' }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }) {
  return <AdminShell><Suspense>{children}</Suspense></AdminShell>;
}
