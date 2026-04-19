import type { SVGProps } from 'react';

export type DiagramType =
  | 'genogram'
  | 'ecomap'
  | 'pedigree'
  | 'phylo'
  | 'sociogram'
  | 'timing'
  | 'logic'
  | 'circuit'
  | 'block'
  | 'ladder'
  | 'sld'
  | 'entity'
  | 'fishbone'
  | 'flowchart'
  | 'venn'
  | 'orgchart'
  | 'decision'
  | 'matrix'
  | 'timeline'
  | 'mindmap';

const ICON_PATHS: Record<DiagramType, React.ReactNode> = {
  genogram: (
    <>
      <rect x="3" y="4" width="5" height="5" />
      <circle cx="18.5" cy="6.5" r="2.5" />
      <path d="M8 6.5 H16" />
      <path d="M12 6.5 V12" />
      <rect x="9.5" y="15" width="5" height="5" />
      <path d="M9.5 15 L14.5 20" />
    </>
  ),
  ecomap: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="4.5" cy="5" r="1.8" />
      <circle cx="20" cy="5" r="1.8" />
      <circle cx="4.5" cy="19" r="1.8" />
      <circle cx="20" cy="19" r="1.8" />
      <path d="M10 10 L6 6" />
      <path d="M14 10 L18 6" strokeDasharray="1.5 2" />
      <path d="M10 14 L6 18" />
      <path d="M14 14 L18 18" />
    </>
  ),
  pedigree: (
    <>
      <rect x="3" y="3" width="4" height="4" />
      <circle cx="19" cy="5" r="2" />
      <path d="M7 5 H17" />
      <path d="M13 7 V11" />
      <path d="M8 11 H18" />
      <rect x="6" y="11" width="4" height="4" fill="currentColor" />
      <circle cx="16" cy="13" r="2" fill="currentColor" />
      <rect x="3" y="18" width="4" height="4" />
      <circle cx="11" cy="20" r="2" fill="currentColor" />
      <path d="M8 15 V18 M8 18 H5 M16 15 V18 H11" />
    </>
  ),
  phylo: (
    <>
      <path d="M3 12 H8" />
      <path d="M8 5 V19" />
      <path d="M8 5 H13 M8 13 H13 M8 19 H21" />
      <path d="M13 3 V7 M13 3 H21 M13 7 H21" />
      <path d="M13 11 V15 M13 11 H21 M13 15 H21" />
    </>
  ),
  sociogram: (
    <>
      <circle cx="12" cy="12" r="2" />
      <circle cx="4" cy="6" r="1.8" />
      <circle cx="20" cy="7" r="1.8" />
      <circle cx="5" cy="19" r="1.8" />
      <circle cx="19" cy="18" r="1.8" />
      <path d="M10.5 10.8 L5.5 7" />
      <path d="M13.5 11 L18.3 7.6" />
      <path d="M10.8 13.4 L6.3 17.8" />
      <path d="M13.4 13.2 L17.6 16.8" />
      <path d="M5.3 7.5 L18.6 7.5" />
    </>
  ),
  timing: (
    <>
      <path d="M3 7 H6 V3 H11 V7 H14 V3 H19 V7 H22" />
      <path d="M3 17 H8 V13 H13 V17 H16 V13 H20 V17 H22" />
      <path d="M3 11 H22" strokeDasharray="1 2" />
    </>
  ),
  logic: (
    <>
      <path d="M4 6 H11 A6 6 0 0 1 11 18 H4 Z" />
      <path d="M1 9 H4 M1 15 H4 M17 12 H22" />
    </>
  ),
  circuit: (
    <>
      <path d="M3 12 H7" />
      <rect x="7" y="10" width="6" height="4" />
      <path d="M13 12 H16" />
      <circle cx="19" cy="12" r="3" />
      <path d="M19 9 V15 M17 12 H21" />
      <path d="M3 6 V12 M21 12 V18 M3 18 H21" />
    </>
  ),
  block: (
    <>
      <rect x="3" y="9" width="5" height="6" />
      <rect x="10" y="4" width="5" height="6" />
      <rect x="10" y="14" width="5" height="6" />
      <rect x="17" y="9" width="4" height="6" />
      <path d="M8 11 H10 M8 13 H10 M15 7 H17 V11 M15 17 H17 V13" />
      <path d="M12.5 10 V14" />
    </>
  ),
  ladder: (
    <>
      <path d="M3 3 V21 M21 3 V21" />
      <path d="M3 7 H8 M10 5 V9 M12 5 V9 M14 7 H21" />
      <path d="M3 13 H8 M10 11 V15 M10 11 L12 15 M12 11 L10 15 M14 13 H17" />
      <circle cx="19" cy="13" r="1.6" />
      <path d="M3 19 H10 M12 17 V21 M14 19 H21" />
    </>
  ),
  sld: (
    <>
      <path d="M12 2 V5" />
      <circle cx="12" cy="7.5" r="2.5" />
      <path d="M12 10 V12" />
      <path d="M8 12 H16" />
      <path d="M12 12 V15" />
      <rect x="9.5" y="15" width="5" height="3" />
      <path d="M12 18 V20 M9 20 H15 M10 22 H14 M11 22 L11 20" />
    </>
  ),
  entity: (
    <>
      <rect x="8" y="3" width="8" height="4" />
      <path d="M12 7 V10 M5 10 H19" />
      <path d="M5 10 V12 M12 10 V12 M19 10 V12" />
      <rect x="3" y="12" width="4" height="4" />
      <rect x="10" y="12" width="4" height="4" />
      <rect x="17" y="12" width="4" height="4" />
      <path d="M10.5 16 H13.5 M10.5 18 H13.5 M10.5 20 H13.5" />
      <rect x="10" y="16.5" width="4" height="1.2" />
    </>
  ),
  fishbone: (
    <>
      <path d="M2 12 H20" />
      <path d="M20 12 L22 10 M20 12 L22 14" />
      <path d="M6 12 L9 5 M10 12 L13 5 M14 12 L17 5" />
      <path d="M6 12 L9 19 M10 12 L13 19 M14 12 L17 19" />
    </>
  ),
  flowchart: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="2" />
      <path d="M12 6 V9" />
      <path d="M12 9 L18 13 L12 17 L6 13 Z" />
      <path d="M12 17 V20" />
      <rect x="8" y="20" width="8" height="2.8" />
    </>
  ),
  venn: (
    <>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </>
  ),
  orgchart: (
    <>
      <rect x="9" y="3" width="6" height="4" />
      <path d="M12 7 V10 M5 10 H19 M5 10 V13 M12 10 V13 M19 10 V13" />
      <rect x="3" y="13" width="4" height="4" />
      <rect x="10" y="13" width="4" height="4" />
      <rect x="17" y="13" width="4" height="4" />
      <path d="M5 17 V20 M3 20 H7 M12 17 V20 M10 20 H14 M19 17 V20 M17 20 H21" />
    </>
  ),
  decision: (
    <>
      <path d="M12 3 L16 7 L12 11 L8 7 Z" />
      <path d="M9.5 9 L5 14 M14.5 9 L19 14" />
      <path d="M3 14 L5 12 L7 14 L5 16 Z" />
      <path d="M17 14 L19 12 L21 14 L19 16 Z" />
      <rect x="3" y="18" width="4" height="3" />
      <rect x="10" y="18" width="4" height="3" />
      <rect x="17" y="18" width="4" height="3" />
      <path d="M5 16 V18 M12 11 V18 M19 16 V18" />
    </>
  ),
  matrix: (
    <>
      <rect x="3" y="3" width="18" height="18" />
      <path d="M9 3 V21 M15 3 V21 M3 9 H21 M3 15 H21" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </>
  ),
  timeline: (
    <>
      <path d="M2 12 H22" />
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="11" cy="12" r="1.6" fill="currentColor" />
      <circle cx="17" cy="12" r="1.6" fill="currentColor" />
      <path d="M5 12 V7 M11 12 V17 M17 12 V7" />
      <path d="M2 8 H7 M8 18 H14 M14 8 H19" />
    </>
  ),
  mindmap: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 9.5 Q8 4 4 3" />
      <path d="M12 9.5 Q16 4 20 3" />
      <path d="M12 14.5 Q8 20 4 21" />
      <path d="M12 14.5 Q16 20 20 21" />
      <circle cx="4" cy="3" r="1.3" fill="currentColor" />
      <circle cx="20" cy="3" r="1.3" fill="currentColor" />
      <circle cx="4" cy="21" r="1.3" fill="currentColor" />
      <circle cx="20" cy="21" r="1.3" fill="currentColor" />
    </>
  ),
};

interface DiagramIconProps extends SVGProps<SVGSVGElement> {
  type: DiagramType;
  size?: number;
}

export function DiagramIcon({ type, size = 16, className, ...props }: DiagramIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {ICON_PATHS[type]}
    </svg>
  );
}
