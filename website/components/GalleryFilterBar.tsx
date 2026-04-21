'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DIAGRAM_LABELS,
  INDUSTRY_LABELS,
  CLUSTER_TO_TYPES,
  type DiagramType,
  type GalleryExample,
  type Industry,
} from '@/lib/gallery-examples';

interface GalleryFilterBarProps {
  examples: GalleryExample[];
  totalCount: number;
  visibleCount: number;
  activeDiagram: DiagramType | null;
  activeIndustry: Industry | null;
  activeQuery: string;
}

export function GalleryFilterBar({
  examples,
  totalCount,
  visibleCount,
  activeDiagram,
  activeIndustry,
  activeQuery,
}: GalleryFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [queryInput, setQueryInput] = useState(activeQuery);
  useEffect(() => setQueryInput(activeQuery), [activeQuery]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      if (queryInput !== activeQuery) setParam('q', queryInput || null);
    }, 180);
    return () => clearTimeout(id);
  }, [queryInput, activeQuery, setParam]);

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActive = activeDiagram !== null || activeIndustry !== null || activeQuery !== '';

  const counts = useMemo(() => {
    const diagramCounts = new Map<DiagramType, number>();
    const industryCounts = new Map<Industry, number>();
    const q = activeQuery.toLowerCase();

    for (const ex of examples) {
      const matchesQ =
        !q ||
        ex.title.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q) ||
        ex.standard.toLowerCase().includes(q);
      if (!matchesQ) continue;

      const matchesDiagram = activeDiagram === null || ex.diagram === activeDiagram;
      const matchesIndustry = activeIndustry === null || ex.industry === activeIndustry;

      if (matchesIndustry) {
        diagramCounts.set(ex.diagram, (diagramCounts.get(ex.diagram) ?? 0) + 1);
      }
      if (matchesDiagram) {
        industryCounts.set(ex.industry, (industryCounts.get(ex.industry) ?? 0) + 1);
      }
    }
    return { diagramCounts, industryCounts };
  }, [examples, activeDiagram, activeIndustry, activeQuery]);

  // Diagram types present in the dataset, ordered by cluster grouping
  const diagramsPresent = useMemo(() => {
    const inDataset = new Set(examples.map((e) => e.diagram));
    const ordered: DiagramType[] = [];
    for (const types of Object.values(CLUSTER_TO_TYPES)) {
      for (const t of types as DiagramType[]) {
        if (inDataset.has(t)) ordered.push(t);
      }
    }
    return ordered;
  }, [examples]);

  const diagramOptions = diagramsPresent.map((t) => ({
    value: t,
    label: DIAGRAM_LABELS[t]?.label ?? t,
    count: counts.diagramCounts.get(t) ?? 0,
  }));

  const industryOptions = (Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => ({
    value: k,
    label: INDUSTRY_LABELS[k].label,
    count: counts.industryCounts.get(k) ?? 0,
  }));

  return (
    <div
      className="sticky top-0 z-30 -mx-6 px-6 py-4 backdrop-blur-md"
      style={{ borderBottom: '1px solid var(--fill-muted)', background: 'color-mix(in srgb, var(--bg) 90%, transparent)' }}
    >
      <div className="mx-auto max-w-6xl flex flex-col gap-3">
        {/* Row 1: search */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            border: '1px solid var(--fill-muted)',
            borderRadius: 'var(--r-sm)',
            background: 'var(--fill)',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--text-muted)', opacity: 0.6, flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="search examples…"
            className="flex-1 bg-transparent font-mono text-xs focus:outline-none"
            style={{ color: 'var(--text)' }}
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput('')}
              className="font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              ×
            </button>
          )}
        </div>

        {/* Row 2: USE-CASE chips */}
        <div className="flex items-center gap-3">
          <span className="type-eye shrink-0">USE-CASE ·</span>
          <div className="flex flex-wrap gap-1.5">
            {industryOptions.map((opt) => {
              const isActive = activeIndustry === opt.value;
              const isDisabled = opt.count === 0 && !isActive;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`gal-chip${isActive ? ' active' : ''}`}
                  disabled={isDisabled}
                  onClick={() => setParam('industry', isActive ? null : opt.value)}
                >
                  {opt.label}
                  <span style={{ opacity: 0.5 }}>{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: DIAGRAM chips */}
        <div className="flex items-center gap-3">
          <span className="type-eye shrink-0">DIAGRAM ·</span>
          <div className="flex flex-wrap gap-1.5">
            {diagramOptions.map((opt) => {
              const isActive = activeDiagram === opt.value;
              const isDisabled = opt.count === 0 && !isActive;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`gal-chip${isActive ? ' active' : ''}`}
                  disabled={isDisabled}
                  onClick={() => setParam('type', isActive ? null : opt.value)}
                >
                  {opt.label}
                  <span style={{ opacity: 0.5 }}>{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text)' }}>{visibleCount}</span>
            {' results'}
            {hasActive && (
              <>
                <span className="mx-1.5" style={{ opacity: 0.4 }}>·</span>
                {`filtered from ${totalCount}`}
              </>
            )}
          </span>
          {hasActive && (
            <button
              type="button"
              onClick={clearAll}
              className="font-mono text-xs transition"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              reset filters ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
