'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemedSvgProps {
  light: string;
  darkSrc: string;
  className?: string;
}

/** Keep one SVG in the DOM; dark thumbnails are fetched lazily when needed. */
export function ThemedSvg({ light, darkSrc, className = '' }: ThemedSvgProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div className={className}>
      {isDark ? (
        // SVG is already vector output from the renderer; Next image optimization
        // would rasterize/cache work that the browser can display directly.
        <img
          src={darkSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: light }} />
      )}
    </div>
  );
}
