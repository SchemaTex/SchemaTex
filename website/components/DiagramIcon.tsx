import type { SVGProps } from 'react';
import { resolveDiagramType, type DiagramType } from 'schematex/ai';
import { DIAGRAM_ICON_MARKUP } from '@/lib/diagram-icons.generated';

export type { DiagramType };

interface DiagramIconProps extends SVGProps<SVGSVGElement> {
  // Accepts any string; non-canonical ids (e.g. "block") are resolved to the
  // registry type ("blockdiagram") before lookup.
  type: DiagramType | string;
  size?: number;
}

// The glyph markup is generated from the designed sources in assets/icons/*.svg
// (see scripts/build-diagram-icons.mjs). This component is pure presentation —
// it only wraps the shared 24x24 / currentColor / stroke-1.5 shell.
export function DiagramIcon({ type, size = 16, className, ...props }: DiagramIconProps) {
  const key = (type in DIAGRAM_ICON_MARKUP ? type : resolveDiagramType(type)) as
    | DiagramType
    | undefined;
  const markup = key ? DIAGRAM_ICON_MARKUP[key] : undefined;
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
      {...(markup ? { dangerouslySetInnerHTML: { __html: markup } } : {})}
      {...props}
    />
  );
}
