'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  COMPLEXITY_LABELS,
  DIAGRAM_LABELS,
  INDUSTRY_LABELS,
  type Complexity,
  type DiagramType,
  type GalleryExample,
  type Industry,
} from '@/lib/gallery-examples';
import { FilterChips } from './FilterChips';

interface GalleryFilterBarProps {
  examples: GalleryExample[];
  totalCount: number;
  visibleCount: number;
  activeType: DiagramType | null;
  activeIndustry: Industry | null;
  activeComplexity: Complexity | null;
}

export function GalleryFilterBar({
  examples,
  totalCount,
  visibleCount,
  activeType,
  activeIndustry,
  activeComplexity,
}: GalleryFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) params.delete(key);
      else params.set(key, value);
      // Clear cluster when manually changing type
      if (key === 'type') params.delete('cluster');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActive =
    activeType !== null || activeIndustry !== null || activeComplexity !== null;

  // Count per type / industry / complexity across the full dataset (respecting other active filters)
  const counts = useMemo(() => {
    const typeCounts = new Map<DiagramType, number>();
    const industryCounts = new Map<Industry, number>();
    const complexityCounts = new Map<Complexity, number>();

    for (const ex of examples) {
      // For each axis, count entries matching *other* filters (so counts reflect
      // what you'd see if you also applied this chip).
      if (
        (activeIndustry === null || ex.industry === activeIndustry) &&
        (activeComplexity === null || ex.complexity === activeComplexity)
      ) {
        typeCounts.set(ex.diagram, (typeCounts.get(ex.diagram) ?? 0) + 1);
      }
      if (
        (activeType === null || ex.diagram === activeType) &&
        (activeComplexity === null || ex.complexity === activeComplexity)
      ) {
        industryCounts.set(ex.industry, (industryCounts.get(ex.industry) ?? 0) + 1);
      }
      if (
        (activeType === null || ex.diagram === activeType) &&
        (activeIndustry === null || ex.industry === activeIndustry)
      ) {
        complexityCounts.set(
          ex.complexity,
          (complexityCounts.get(ex.complexity) ?? 0) + 1,
        );
      }
    }
    return { typeCounts, industryCounts, complexityCounts };
  }, [examples, activeType, activeIndustry, activeComplexity]);

  // Only show type chips that have ≥ 1 example in dataset
  const typesPresent = useMemo(() => {
    const set = new Set<DiagramType>();
    for (const ex of examples) set.add(ex.diagram);
    return Array.from(set);
  }, [examples]);

  const typeOptions = typesPresent.map((t) => ({
    value: t,
    label: DIAGRAM_LABELS[t].label,
    icon: DIAGRAM_LABELS[t].icon,
    count: counts.typeCounts.get(t) ?? 0,
  }));

  const industryOptions = (Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => ({
    value: k,
    label: INDUSTRY_LABELS[k].label,
    icon: INDUSTRY_LABELS[k].icon,
    count: counts.industryCounts.get(k) ?? 0,
  }));

  const complexityOptions = ([1, 2, 3] as Complexity[]).map((c) => ({
    value: String(c),
    label: COMPLEXITY_LABELS[c],
    count: counts.complexityCounts.get(c) ?? 0,
  }));

  return (
    <div className="sticky top-0 z-30 -mx-6 border-b border-fd-border bg-fd-background/85 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-fd-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-fd-foreground tabular-nums">
              {visibleCount}
            </span>{' '}
            of <span className="tabular-nums">{totalCount}</span>
          </div>
          {hasActive && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-md border border-fd-border bg-fd-card px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition hover:border-fd-primary hover:text-fd-foreground"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
          <FilterChips
            label="Type"
            options={typeOptions}
            selected={activeType}
            onChange={(v) => setParam('type', v)}
          />
          <FilterChips
            label="Industry"
            options={industryOptions}
            selected={activeIndustry}
            onChange={(v) => setParam('industry', v)}
          />
          <FilterChips
            label="Complexity"
            options={complexityOptions}
            selected={activeComplexity === null ? null : String(activeComplexity)}
            onChange={(v) => setParam('complexity', v)}
          />
        </div>
      </div>
    </div>
  );
}
