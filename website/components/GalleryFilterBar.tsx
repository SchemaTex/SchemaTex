'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  INDUSTRY_LABELS,
  CLUSTER_TO_TYPES,
  type GalleryExample,
  type Industry,
} from '@/lib/gallery-examples';

type ClusterKey = keyof typeof CLUSTER_TO_TYPES;

const CLUSTER_META: Record<ClusterKey, { label: string; color: string }> = {
  relationships: { label: 'Relationships', color: 'var(--cat-0)' },
  'electrical-industrial': { label: 'Electrical & Industrial', color: 'var(--cat-2)' },
  'corporate-legal': { label: 'Corporate & Legal', color: 'var(--cat-3)' },
  'causality-analysis': { label: 'Causality & Analysis', color: 'var(--cat-1)' },
};

interface GalleryFilterBarProps {
  examples: GalleryExample[];
  totalCount: number;
  visibleCount: number;
  activeCluster: ClusterKey | null;
  activeIndustry: Industry | null;
  activeQuery: string;
}

export function GalleryFilterBar({
  examples,
  totalCount,
  visibleCount,
  activeCluster,
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

  const hasActive =
    activeCluster !== null || activeIndustry !== null || activeQuery !== '';

  const counts = useMemo(() => {
    const clusterCounts = new Map<ClusterKey, number>();
    const industryCounts = new Map<Industry, number>();
    const q = activeQuery.toLowerCase();

    for (const ex of examples) {
      const matchesQ =
        !q ||
        ex.title.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q) ||
        ex.standard.toLowerCase().includes(q);
      if (!matchesQ) continue;

      for (const [k, types] of Object.entries(CLUSTER_TO_TYPES) as [ClusterKey, string[]][]) {
        if (types.includes(ex.diagram)) {
          if (activeIndustry === null || ex.industry === activeIndustry) {
            clusterCounts.set(k, (clusterCounts.get(k) ?? 0) + 1);
          }
        }
      }
      if (
        activeCluster === null ||
        CLUSTER_TO_TYPES[activeCluster]?.includes(ex.diagram)
      ) {
        industryCounts.set(ex.industry, (industryCounts.get(ex.industry) ?? 0) + 1);
      }
    }
    return { clusterCounts, industryCounts };
  }, [examples, activeCluster, activeIndustry, activeQuery]);

  const clusterOptions = (Object.keys(CLUSTER_META) as ClusterKey[]).map((k) => ({
    value: k,
    label: CLUSTER_META[k].label,
    color: CLUSTER_META[k].color,
    count: counts.clusterCounts.get(k) ?? 0,
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
        {/* Row 1: full-width search */}
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

        {/* Row 2: CLUSTER chips */}
        <div className="flex items-center gap-3">
          <span className="type-eye shrink-0">CLUSTER ·</span>
          <div className="flex flex-wrap gap-1.5">
            {clusterOptions.map((opt) => {
              const isActive = activeCluster === opt.value;
              const isDisabled = opt.count === 0 && !isActive;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`gal-chip${isActive ? ' active' : ''}`}
                  disabled={isDisabled}
                  onClick={() => setParam('cluster', isActive ? null : opt.value)}
                >
                  <span aria-hidden style={{ color: isActive ? 'inherit' : opt.color, fontSize: 9 }}>■</span>
                  {opt.label}
                  <span style={{ opacity: 0.5 }}>{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: USE-CASE chips */}
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
