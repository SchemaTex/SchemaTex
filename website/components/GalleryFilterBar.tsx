'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  INDUSTRY_LABELS,
  CLUSTER_TO_TYPES,
  type GalleryExample,
  type Industry,
} from '@/lib/gallery-examples';
import { FilterChips } from './FilterChips';

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

  // Debounced search commit
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
    icon: INDUSTRY_LABELS[k].icon,
    count: counts.industryCounts.get(k) ?? 0,
  }));

  return (
    <div className="sticky top-0 z-30 -mx-6 border-b border-fd-border bg-fd-background/85 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-xs text-fd-muted-foreground">
            <span className="tabular-nums text-fd-foreground">{visibleCount}</span>
            <span className="mx-1.5 opacity-40">/</span>
            <span className="tabular-nums">{totalCount}</span>
            <span className="ml-2 opacity-70">examples</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1"
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
                className="opacity-60"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="search examples…"
                className="w-44 bg-transparent font-mono text-xs text-fd-foreground placeholder:text-fd-muted-foreground/60 focus:outline-none"
              />
            </div>
            {hasActive && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 px-2.5 py-1 font-mono text-xs text-fd-muted-foreground transition hover:text-fd-foreground"
                style={{
                  border: '1px solid var(--fill-muted)',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--fill)',
                }}
              >
                clear
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <FilterChips
            label="Cluster"
            options={clusterOptions}
            selected={activeCluster}
            onChange={(v) => setParam('cluster', v)}
          />
          <FilterChips
            label="Use-case"
            options={industryOptions}
            selected={activeIndustry}
            onChange={(v) => setParam('industry', v)}
          />
        </div>
      </div>
    </div>
  );
}
