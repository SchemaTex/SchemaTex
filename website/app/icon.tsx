import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* left bracket */}
        <path
          d="M 5 3 H 2.5 V 21 H 5"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        {/* right bracket */}
        <path
          d="M 19 3 H 21.5 V 21 H 19"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        {/* S-curve */}
        <path
          d="M 16 7 C 16 12, 8 12, 8 17"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* nodes */}
        <circle cx="16" cy="7" r="2.2" fill="#0f172a" />
        <circle cx="8" cy="17" r="2.2" fill="#0f172a" />
      </svg>
    ),
    { ...size },
  );
}
