'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { Header, Box, Stat, Loader, Failed } from '@/components/admin/Kit';
import { RANGES } from '@/components/admin/Filters';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, qs, inr } from '@/lib/admin';
import { navFor } from '@/components/admin/AdminShell';

const C = { wine: '#c8102e', brass: '#e8838e', charcoal: '#7a0a1c', stone: '#e0b3ba', grid: '#f4e3e5' };
const axis = { fontSize: 11, fill: '#6e5a5d' };

function Bars({ data, color = C.wine, height = 240, vertical = true }) {
  if (!data?.length) return <p className="py-10 text-center text-sm text-graphite">No data for this period.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(height, data.length * 34 + 30)}>
      <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ left: 8, right: 16 }}>
        <CartesianGrid stroke={C.grid} horizontal={!vertical} vertical={vertical} />
        {/* Recharts reads axes from direct children only — no fragments here. */}
        <XAxis type={vertical ? 'number' : 'category'} dataKey={vertical ? undefined : 'label'} tick={axis} allowDecimals={false} />
        <YAxis type={vertical ? 'category' : 'number'} dataKey={vertical ? 'label' : undefined} tick={axis} width={vertical ? 130 : 40} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,.04)' }} />
        <Bar dataKey="count" fill={color} radius={[0, 2, 2, 0]} name="Leads" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [range, setRange] = useState({ range: '30d', from: '', to: '' });
  const allowed = can(user, 'dashboard.view');
  const { data, error, loading, reload } = useApi(allowed ? `/admin/dashboard${qs(range)}` : null);

  useEffect(() => { if (!allowed) router.replace(navFor(user)[0]?.[1][0]?.[0] || '/admin/bookings'); }, [allowed, user, router]);
  if (!allowed) return <Loader />;

  const t = data?.totals;
  const q = data?.quotations;
  return (
    <>
      <Header title="Dashboard" subtitle="Figures for the selected period">
        <select aria-label="Period" className="h-9 rounded-none border border-stone-deep bg-paper px-2.5 text-sm" value={range.range} onChange={(e) => setRange({ range: e.target.value, from: '', to: '' })}>
          {RANGES.filter(([v]) => v).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {range.range === 'custom' && <>
          <input type="date" aria-label="From" className="h-9 rounded-none border border-stone-deep bg-paper px-2 text-sm" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <input type="date" aria-label="To" className="h-9 rounded-none border border-stone-deep bg-paper px-2 text-sm" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </>}
      </Header>
      {error ? <Failed error={error} retry={reload} /> : !data ? <Loader /> : (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Stat label="Total leads" value={t.totalLeads} />
            <Stat label="New (unverified)" value={t.newLeads} />
            <Stat label="Verified" value={t.verifiedLeads} hint={`${t.verificationRate}% of leads`} />
            <Stat label="Abandoned" value={t.abandonedLeads} hint="Idle over 24h" />
            <Stat label="Bookings" value={t.bookings} />
            <Stat label="Site visits" value={t.siteVisits} />
            <Stat label="Conversion" value={`${t.conversionRate}%`} hint="Leads → bookings" />
          </div>
          {q && (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              <Stat label="Quotations" value={q.total} hint={`${q.draft} draft`} />
              <Stat label="Awaiting review" value={q.underReview} />
              <Stat label="Sent" value={q.sent} />
              <Stat label="Quotation value sent" value={inr(q.sentValue)} />
              <Stat label="Accepted" value={q.accepted} hint={inr(q.acceptedValue)} />
              <Stat label="Rejected" value={q.rejected} hint={`${q.revisionRequested} revision requests`} />
              <Stat label="Acceptance rate" value={`${q.acceptanceRate}%`} />
            </div>
          )}
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Box title="Lead trend" className="xl:col-span-2">
              {data.trend.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.trend} margin={{ right: 16 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={axis} allowDecimals={false} />
                    <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="leads" name="Leads" stroke={C.charcoal} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="verified" name="Verified" stroke={C.brass} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="booked" name="Booked" stroke={C.wine} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-graphite">No leads in this period.</p>}
            </Box>
            <Box title="Leads by status"><Bars data={data.leadsByStatus.map((r) => ({ ...r, label: r.label.replace(/_/g, ' ').toLowerCase() }))} color={C.charcoal} /></Box>
            <Box title="Leads by city"><Bars data={data.leadsByCity} /></Box>
            <Box title="Leads by service"><Bars data={data.leadsByService} color={C.brass} /></Box>
            <Box title="Leads by configuration"><Bars data={data.leadsByBhk} color={C.charcoal} /></Box>
            <Box title="Estimates by package"><Bars data={data.leadsByPackage} color={C.wine} /></Box>
            <Box title="Contractor workload" className="xl:col-span-2" pad={false}>
              {data.contractorWorkload.length ? (
                <table className="w-full text-sm">
                  <thead className="border-b-2 border-wine bg-blush text-xs text-charcoal"><tr><th className="px-5 py-2 text-left font-medium">Contractor</th><th className="px-5 py-2 text-right font-medium">Open bookings</th><th className="px-5 py-2 text-right font-medium">Visits pending</th></tr></thead>
                  <tbody className="divide-y divide-stone">{data.contractorWorkload.map((c) => <tr key={c.id}><td className="px-5 py-2.5">{c.name}</td><td className="tabular px-5 py-2.5 text-right">{c.open}</td><td className="tabular px-5 py-2.5 text-right">{c.siteVisitsPending}</td></tr>)}</tbody>
                </table>
              ) : <p className="p-5 text-sm text-graphite">No open assignments.</p>}
            </Box>
          </div>
        </div>
      )}
    </>
  );
}
