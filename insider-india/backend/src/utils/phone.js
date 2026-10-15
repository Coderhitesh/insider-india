// Normalises Indian mobile numbers to 10 digits (6-9 prefix).
function normalizeMobile(input) {
  if (input === undefined || input === null) return null;
  let d = String(input).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

const maskMobile = (m) => (m ? `+91 ${'X'.repeat(7)}${m.slice(-3)}` : '');
const toE164 = (m) => `+91${m}`;

module.exports = { normalizeMobile, maskMobile, toE164 };
