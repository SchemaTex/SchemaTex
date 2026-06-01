import type { SVGProps } from 'react';
import type { DiagramCluster } from 'schematex/ai';

// Designed line-glyphs for each domain cluster — house style (24x24, currentColor,
// stroke 1.5). Deliberately not emoji: cross-platform-consistent and on-brand.
const CLUSTER_PATHS: Record<DiagramCluster, React.ReactNode> = {
  relationships: (
    <>
      <circle cx="6.5" cy="8" r="3" />
      <rect x="14" y="5" width="6" height="6" />
      <path d="M6.5 11 V16 H17 V11" />
      <path d="M11.75 16 V20" />
    </>
  ),
  'electrical-industrial': (
    <>
      <path d="M13 2 L4 14 H11 L11 22 L20 10 H13 Z" />
    </>
  ),
  'behavior-modeling': (
    <>
      <rect x="2.5" y="9" width="7" height="6" rx="3" />
      <path d="M9.5 12 H14.5" />
      <path d="M12.3 10.5 L14.8 12 L12.3 13.5" />
      <circle cx="18.5" cy="12" r="3" />
    </>
  ),
  'software-uml': (
    // Parent class-box ──▷ child class-box, with the hollow generalization
    // triangle that identifies UML structural diagrams at a glance.
    <>
      <rect x="3" y="3" width="8" height="5.5" />
      <path d="M5 6 H9" />
      <rect x="13" y="15.5" width="8" height="5.5" />
      <path d="M15 18.25 H19" />
      <path d="M17 15.5 L7 11" />
      <path d="M7 11 L10 9.5 L9 12.5 Z" />
    </>
  ),
  concurrency: (
    // Petri net: place (with token) → transition bar → place.
    <>
      <circle cx="4.75" cy="12" r="2.75" />
      <circle cx="4.75" cy="12" r="0.9" fill="currentColor" />
      <path d="M7.5 12 H10.5" />
      <rect x="10.75" y="6.5" width="2.5" height="11" rx="0.4" />
      <path d="M13.25 12 H16.5" />
      <path d="M15 10.3 L16.7 12 L15 13.7" />
      <circle cx="19.25" cy="12" r="2.75" />
    </>
  ),
  'risk-reliability': (
    // Shield with an AND-gate dome inside — fault-tree / reliability safety.
    <>
      <path d="M12 2.5 L20 5.5 V11 C20 16 16.5 19.5 12 21.5 C7.5 19.5 4 16 4 11 V5.5 Z" />
      <path d="M8.5 14 V11 A3.5 3.5 0 0 1 15.5 11 V14 Z" />
    </>
  ),
  'corporate-legal': (
    <>
      <path d="M4 21 V8 L12 3 L20 8 V21" />
      <path d="M2.5 21 H21.5" />
      <path d="M9 21 V13 H15 V21" />
      <path d="M7.5 10 H10 M14 10 H16.5" />
    </>
  ),
  'causality-analysis': (
    <>
      <path d="M2 12 H20" />
      <path d="M20 12 L17 9.5 M20 12 L17 14.5" />
      <path d="M7 12 L5 7 M12.5 12 L10.5 7 M7 12 L5 17 M12.5 12 L10.5 17" />
    </>
  ),
  strategy: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M12 3.5 V20.5 M3.5 12 H20.5" />
    </>
  ),
  knowledge: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9 Q9 4 5 3.5 M12 15 Q9 20 5 20.5 M15 12 Q20 12 20.5 12" />
      <circle cx="5" cy="3.5" r="1.3" fill="currentColor" />
      <circle cx="5" cy="20.5" r="1.3" fill="currentColor" />
      <circle cx="20.5" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  research: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="M14.5 14.5 L21 21" />
    </>
  ),
  'project-management': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 8.5 H21" />
      <path d="M6 12.5 H13 M9 16 H17" />
    </>
  ),
  'network-infrastructure': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M5 7 Q12 10 19 7 M5 17 Q12 14 19 17" />
    </>
  ),
  generic: (
    <>
      <rect x="3.5" y="4" width="8" height="6" rx="1" />
      <path d="M7.5 10 V14 H16.5" />
      <path d="M14 12 L16.5 14 L14 16" />
      <rect x="13" y="14" width="7.5" height="6" rx="1" />
    </>
  ),
};

interface ClusterIconProps extends SVGProps<SVGSVGElement> {
  cluster: DiagramCluster;
  size?: number;
}

export function ClusterIcon({ cluster, size = 18, className, ...props }: ClusterIconProps) {
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
      {CLUSTER_PATHS[cluster]}
    </svg>
  );
}
