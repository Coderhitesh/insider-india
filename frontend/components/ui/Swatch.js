import clsx from 'clsx';

// Material swatches: the site's visual motif (sample boards). Tones map to real finishes.
export const MATERIALS = {
  wine: { bg: 'bg-wine', tx: 'tx-grain', name: 'Lacquer, oxblood', ink: 'text-paper' },
  charcoal: { bg: 'bg-charcoal', tx: 'tx-brushed', name: 'Smoked metal', ink: 'text-paper' },
  terracotta: { bg: 'bg-terracotta', tx: 'tx-grain', name: 'Fired clay', ink: 'text-paper' },
  sand: { bg: 'bg-stone', tx: 'tx-weave', name: 'Linen weave', ink: 'text-charcoal' },
  stone: { bg: 'bg-stone-deep', tx: 'tx-grain', name: 'Honed stone', ink: 'text-charcoal' },
  oak: { bg: 'bg-oak', tx: 'tx-wood', name: 'Smoked oak veneer', ink: 'text-paper' },
  brass: { bg: 'bg-brass', tx: 'tx-brushed', name: 'Brushed brass', ink: 'text-paper' },
  paper: { bg: 'bg-paper', tx: 'tx-grain', name: 'Matte white', ink: 'text-charcoal' },
};

export default function Swatch({ tone = 'sand', className, children, label = false }) {
  const m = MATERIALS[tone] || MATERIALS.sand;
  return (
    <div className={clsx('overflow-hidden', !/\b(absolute|fixed)\b/.test(className || '') && 'relative', m.bg, m.tx, className)}>
      {label && <span className={clsx('absolute bottom-2 left-2.5 text-[0.7rem] tracking-wide opacity-85', m.ink)}>{m.name}</span>}
      {children}
    </div>
  );
}
