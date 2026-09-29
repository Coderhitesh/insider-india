import { ImageResponse } from 'next/og';

export const alt = 'INSIDER INDIA LLP — Interiors designed around the way you live';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  const chip = (bg, flex) => <div style={{ background: bg, flex, display: 'flex' }} />;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f3eee6', color: '#262320', padding: 64 }}>
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 30, letterSpacing: 4 }}>INSIDER INDIA LLP</div>
          <div style={{ fontSize: 70, lineHeight: 1.05, maxWidth: 640 }}>Interiors designed around the way you live.</div>
          <div style={{ fontSize: 24, color: '#5b544d' }}>Full homes, kitchens, wardrobes and renovation</div>
        </div>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flex: 3, gap: 10 }}>{chip('#9c7a55', 2)}{chip('#5e1f2b', 1)}</div>
          <div style={{ display: 'flex', flex: 1, gap: 10 }}>{chip('#d9cfc0', 1)}{chip('#a67c3d', 1)}{chip('#262320', 1)}</div>
        </div>
      </div>
    ),
    size,
  );
}
