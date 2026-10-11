'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import Notice from '@/components/ui/Notice';
import { Panel, PageTitle, Empty, Loading, LoadError } from '@/components/account/Bits';
import { api } from '@/lib/api';
import { useApi, openSigned } from '@/lib/useApi';
import { formatDate } from '@/lib/format';

const kb = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} KB`);

function DocRow({ icon: Icon = FileText, title, meta, onOpen, href }) {
  const cls = 'text-sm text-wine underline underline-offset-4';
  return (
    <li className="flex items-center gap-4 py-3">
      <Icon className="size-5 shrink-0 text-graphite" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p className="truncate">{title}</p><p className="text-sm text-graphite">{meta}</p></div>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>Open</a> : <button type="button" onClick={onOpen} className={cls}>Open</button>}
    </li>
  );
}

export default function Documents() {
  const { data, error, loading, reload } = useApi('/account/documents');
  const [openError, setOpenError] = useState('');
  const open = (fetcher) => () => { setOpenError(''); openSigned(fetcher).catch((err) => setOpenError(err.message)); };

  if (loading) return <><PageTitle title="Documents" /><Loading /></>;
  if (error) return <><PageTitle title="Documents" /><LoadError error={error} onRetry={reload} /></>;
  const { floorPlans, quotations, projectDocuments } = data;
  const none = !floorPlans.length && !quotations.length && !projectDocuments.length;

  return (
    <>
      <PageTitle title="Documents" />
      {openError && <Notice tone="error" className="mb-6">{openError}</Notice>}
      {none ? <Empty title="No documents yet" body="Floor plans you upload, quotation PDFs and project documents will appear here." /> : (
        <div className="space-y-6">
          {quotations.length > 0 && (
            <Panel title="Quotations">
              <ul className="divide-y divide-stone">
                {quotations.map((q) => (
                  <DocRow key={q.id} title={`${q.displayNumber}.pdf`} meta={`Booking ${q.bookingNumber}, sent ${formatDate(q.sentAt)}${q.isLatest ? '' : ' (earlier version)'}`}
                    onOpen={open(async () => (await api(`/quotations/${q.id}/pdf`)).data.url)} />
                ))}
              </ul>
            </Panel>
          )}
          {floorPlans.length > 0 && (
            <Panel title="Floor plans">
              <ul className="divide-y divide-stone">
                {floorPlans.map((f) => (
                  <DocRow key={f.id} icon={f.mimeType?.startsWith('image/') ? ImageIcon : FileText} title={f.originalName} meta={`Booking ${f.bookingNumber}, ${kb(f.size)}`}
                    onOpen={open(async () => (await api(`/uploads/${f.id}/url`)).data.url)} />
                ))}
              </ul>
            </Panel>
          )}
          {projectDocuments.length > 0 && (
            <Panel title="Project documents">
              <ul className="divide-y divide-stone">
                {projectDocuments.map((d) => <DocRow key={d.id} title={d.title} meta={`Project ${d.projectNumber}`} href={d.url} />)}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
