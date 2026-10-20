import { ImageResponse } from 'next/og';

export const alt = 'INSIDER INDIA LLP — Interiors designed around the way you live';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  const red = '#c8102e';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#fff', color: '#1a0b0d', padding: 64, borderBottom: `24px solid ${red}` }}>
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, background: red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>II</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>INSIDER INDIA</div>
          </div>
          <div style={{ fontSize: 68, lineHeight: 1.04, fontWeight: 800, maxWidth: 680 }}>Interiors designed around the way you live.</div>
          <div style={{ fontSize: 26, color: red, fontWeight: 700 }}>Measured on site. Priced item by item.</div>
        </div>
        <div style={{ flex: 2, display: 'flex', border: `6px solid ${red}`, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 160, width: '60%', height: 6, background: red }} />
          <div style={{ position: 'absolute', left: '60%', top: 0, width: 6, height: '100%', background: red }} />
          <div style={{ position: 'absolute', left: '60%', top: 300, width: '40%', height: 6, background: red }} />
        </div>
      </div>
    ),
    size,
  );
}
