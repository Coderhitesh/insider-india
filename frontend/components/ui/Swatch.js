import clsx from 'clsx';

/**
 * Redline drawings — small architectural line drawings in brand red on a drawing-sheet grid.
 * Replaces photo slots until real photography is added. `tone` picks the drawing.
 */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, vectorEffect: 'non-scaling-stroke', strokeLinecap: 'square' };
const T = { fill: 'currentColor', fontSize: 11, fontFamily: 'var(--font-archivo), sans-serif', letterSpacing: '0.04em' };

function Dim({ x1, y1, x2, y2, label, side = -1 }) {
  const h = y1 === y2;
  const o = 14 * side;
  const [ax1, ay1, ax2, ay2] = h ? [x1, y1 + o, x2, y2 + o] : [x1 + o, y1, x2 + o, y2];
  const tick = (x, y) => (h ? <path d={`M${x - 4} ${y + 4}L${x + 4} ${y - 4}M${x} ${y - 8}V${y + 8}`} {...S} strokeWidth={1} /> : <path d={`M${x - 4} ${y + 4}L${x + 4} ${y - 4}M${x - 8} ${y}H${x + 8}`} {...S} strokeWidth={1} />);
  return (
    <g opacity="0.9">
      <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} {...S} strokeWidth={1} />
      {tick(ax1, ay1)}{tick(ax2, ay2)}
      <text {...T} x={h ? (ax1 + ax2) / 2 : ax1 - 6 * -side} y={h ? ay1 - 5 * -side + (side > 0 ? 12 : 0) : (ay1 + ay2) / 2} textAnchor="middle"
        transform={h ? undefined : `rotate(-90 ${ax1 - 6 * -side} ${(ay1 + ay2) / 2})`}>{label}</text>
    </g>
  );
}

const DRAWINGS = {
  // Living room plan
  oak: (
    <>
      <rect x="60" y="50" width="280" height="200" {...S} strokeWidth={3} />
      <path d="M60 210a40 40 0 0 1 40 40" {...S} strokeDasharray="3 4" /><path d="M60 210v40" {...S} />
      <path d="M90 70h120v36H126v70H90z" {...S} />
      <rect x="150" y="130" width="70" height="44" {...S} />
      <rect x="318" y="100" width="14" height="110" {...S} />
      <circle cx="300" cy="80" r="12" {...S} />
      <rect x="120" y="120" width="130" height="80" {...S} strokeDasharray="2 5" />
      <Dim x1={60} y1={50} x2={340} y2={50} label="4200" />
      <Dim x1={60} y1={50} x2={60} y2={250} label="3600" />
    </>
  ),
  // Kitchen, L-shaped counter
  charcoal: (
    <>
      <rect x="60" y="50" width="280" height="200" {...S} strokeWidth={3} />
      <path d="M60 50h280v48H108v152H60z" {...S} />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={190 + (i % 2) * 26} cy={62 + Math.floor(i / 2) * 22} r="8" {...S} />)}
      <rect x="264" y="58" width="56" height="32" {...S} /><circle cx="292" cy="74" r="5" {...S} />
      <rect x="66" y="196" width="36" height="48" {...S} /><path d="M66 220h36" {...S} />
      <rect x="170" y="150" width="110" height="54" {...S} strokeDasharray="4 4" />
      <Dim x1={60} y1={50} x2={340} y2={50} label="3000" />
      <Dim x1={60} y1={50} x2={60} y2={250} label="2400" />
    </>
  ),
  // Wardrobe elevation
  sand: (
    <>
      <rect x="80" y="40" width="240" height="220" {...S} strokeWidth={3} />
      <path d="M80 86h240M160 86v174M240 86v174M160 40v46M240 40v46" {...S} />
      {[150, 170, 230, 250].map((x) => <path key={x} d={`M${x} 160v26`} {...S} strokeWidth={2.4} />)}
      <path d="M90 116h60" {...S} strokeDasharray="3 4" />
      <path d="M250 200h60M250 224h60" {...S} />
      <Dim x1={80} y1={260} x2={320} y2={260} label="2400" side={1} />
      <Dim x1={80} y1={40} x2={80} y2={260} label="2700" />
    </>
  ),
  // Renovation: wall to be removed (hatched) and new opening
  terracotta: (
    <>
      <rect x="60" y="50" width="280" height="200" {...S} strokeWidth={3} />
      <defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.2" /></pattern></defs>
      <rect x="190" y="50" width="12" height="120" fill="url(#hatch)" {...S} fillOpacity="1" style={{ fill: 'url(#hatch)' }} />
      <path d="M196 170v80" {...S} strokeDasharray="6 5" />
      <path d="M150 110c20-40 70-40 90 0" {...S} strokeDasharray="4 5" />
      <path d="M232 104l8 6 2-10" {...S} />
      <rect x="84" y="190" width="70" height="40" {...S} /><rect x="236" y="196" width="80" height="34" {...S} />
      <Dim x1={60} y1={50} x2={340} y2={50} label="5400" />
    </>
  ),
  // Office / commercial plan
  stone: (
    <>
      <rect x="50" y="50" width="300" height="200" {...S} strokeWidth={3} />
      {[0, 1, 2].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={74 + c * 58} y={78 + r * 66} width="46" height="28" {...S} />))}
      {[0, 1, 2].map((c) => [0, 1].map((r) => <circle key={`o${c}${r}`} cx={97 + c * 58} cy={116 + r * 66} r="6" {...S} />))}
      <path d="M262 50v200" {...S} /><circle cx="306" cy="150" r="28" {...S} />
      <path d="M262 214a26 26 0 0 1 26 26" {...S} strokeDasharray="3 4" />
      <Dim x1={50} y1={50} x2={350} y2={50} label="9000" />
    </>
  ),
  // Inverse sheet: white drawing on red
  wine: (
    <>
      <rect x="60" y="60" width="280" height="180" {...S} strokeWidth={2.4} />
      <path d="M60 150h140v90M200 60v50M260 150h80" {...S} />
      <path d="M200 150a30 30 0 0 1 30-30" {...S} strokeDasharray="3 4" />
      <Dim x1={60} y1={60} x2={340} y2={60} label="6000" />
    </>
  ),
  // Measuring tape
  brass: (
    <>
      {Array.from({ length: 41 }).map((_, i) => <line key={i} x1={40 + i * 8} y1={120} x2={40 + i * 8} y2={i % 10 === 0 ? 170 : i % 5 === 0 ? 158 : 148} {...S} strokeWidth={1} />)}
      <path d="M40 120h320" {...S} strokeWidth={2} />
      {[0, 1, 2, 3, 4].map((i) => <text key={i} {...T} x={40 + i * 80} y={188} textAnchor="middle">{i * 100}</text>)}
    </>
  ),
  paper: null,
};

export const MATERIALS = {
  oak: { name: 'Living room, 1:50' }, charcoal: { name: 'Kitchen, 1:25' }, sand: { name: 'Wardrobe elevation' },
  terracotta: { name: 'Renovation plan' }, stone: { name: 'Office layout' }, wine: { name: 'Plan' }, brass: { name: 'Measured on site' }, paper: { name: '' },
};

export default function Swatch({ tone = 'sand', className, children, label = false }) {
  const inverse = tone === 'wine';
  const positioned = /\b(absolute|fixed)\b/.test(className || '');
  return (
    <div className={clsx('overflow-hidden', !positioned && 'relative', inverse ? 'grid-paper-invert bg-wine text-paper' : 'grid-paper text-wine', className)}>
      {DRAWINGS[tone] && (
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" className={clsx('absolute inset-0 size-full', children && 'opacity-30')} aria-hidden="true">{DRAWINGS[tone]}</svg>
      )}
      {label && MATERIALS[tone]?.name && <span className={clsx('absolute bottom-2 left-3 text-[0.7rem] font-medium', inverse ? 'text-paper/90' : 'text-wine')}>{MATERIALS[tone].name}</span>}
      {children && <div className={clsx('relative flex size-full items-center justify-center', inverse ? 'text-paper' : 'text-wine')}>{children}</div>}
    </div>
  );
}
