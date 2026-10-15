'use client';

export default function GlobalError({ reset }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f3eee6', color: '#262320', padding: '4rem 1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 500 }}>The site didn&apos;t load</h1>
        <p style={{ marginTop: '1rem', maxWidth: '32rem' }}>Please try again in a moment.</p>
        <button type="button" onClick={() => reset()} style={{ marginTop: '1.5rem', background: '#5e1f2b', color: '#fbf8f3', padding: '0.75rem 1.5rem', border: 0, borderRadius: 3 }}>Try again</button>
      </body>
    </html>
  );
}
