import { formatShort } from '@/lib/format';

// Bodoni's hairline en dash disappears at display sizes; render the separator in the UI face.
export default function RangeText({ min, max }) {
  return (
    <>
      <span>{formatShort(min)}</span>
      <span className="mx-[0.3em] font-sans font-light opacity-70" aria-hidden="true">–</span><span className="sr-only"> to </span>
      <span>{formatShort(max)}</span>
    </>
  );
}
