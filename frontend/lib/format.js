const trim = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

// ₹5.5L, ₹1.2Cr, ₹45,000
export function formatShort(v) {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₹${trim(Math.round((n / 1e7) * 10) / 10)}Cr`;
  if (n >= 1e5) return `₹${trim(Math.round((n / 1e5) * 10) / 10)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export const formatRange = (min, max) => `${formatShort(min)} – ${formatShort(max)}`;
export const formatINR = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function normalizeMobile(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
