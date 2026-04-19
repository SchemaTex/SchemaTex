import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 96px',
        }}
      >
        {/* logo lockup: outline mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* outline mark — rings instead of filled dots so it reads on solid blue */}
          <svg width="96" height="96" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {/* left bracket */}
            <path
              d="M 5 3 H 2.5 V 21 H 5"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
            {/* right bracket */}
            <path
              d="M 19 3 H 21.5 V 21 H 19"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
            {/* S-curve — trimmed to stop at ring edges */}
            <path
              d="M 14.2 7.6 C 14 12, 10 12, 9.8 16.4"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* ring endpoints */}
            <circle cx="16" cy="7" r="2" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="8" cy="17" r="2" fill="none" stroke="white" strokeWidth="2" />
          </svg>

          {/* wordmark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              color: 'white',
              fontSize: 88,
              fontWeight: 700,
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            <span>Schema</span>
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontWeight: 400,
                fontSize: 44,
                opacity: 0.75,
                marginLeft: 6,
                letterSpacing: 0,
              }}
            >
              tex
            </span>
          </div>
        </div>

        {/* tagline */}
        <div
          style={{
            marginTop: 40,
            fontSize: 26,
            color: 'rgba(255,255,255,0.75)',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
            letterSpacing: '0.01em',
          }}
        >
          Standards-as-code for professional diagrams
        </div>
      </div>
    ),
    { ...size },
  );
}
