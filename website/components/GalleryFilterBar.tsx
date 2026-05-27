'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface ChipOption<T extends string> {
  value: T;
  label: string;
  count: number;
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(activeQuery !== '');
  useEffect(() => setQueryInput(activeQuery), [activeQuery]);
  useEffect(() => {
    if (activeQuery) setMobileSearchOpen(true);
  }, [activeQuery]);

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

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  // Close sheet on Escape
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const clearAll = useCallback(() => {
    setQueryInput('');
    setMobileSearchOpen(false);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActive = activeDiagram !== null || activeIndustry !== null || activeQuery !== '';
  const activeFilterCount =
    (activeDiagram ? 1 : 0) + (activeIndustry ? 1 : 0);

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

  const diagramOptions: ChipOption<DiagramType>[] = diagramsPresent.map((t) => ({
    value: t,
    label: DIAGRAM_LABELS[t]?.label ?? t,
    count: counts.diagramCounts.get(t) ?? 0,
  }));

  const industryOptions: ChipOption<Industry>[] = (
    Object.keys(INDUSTRY_LABELS) as Industry[]
  ).map((k) => ({
    value: k,
    label: INDUSTRY_LABELS[k].label,
    count: counts.industryCounts.get(k) ?? 0,
  }));

  const renderChipGroup = <T extends string>(
    options: ChipOption<T>[],
    activeValue: T | null,
    paramKey: string,
  ) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = activeValue === opt.value;
        const isDisabled = opt.count === 0 && !isActive;
        return (
          <button
            key={opt.value}
            type="button"
            className={`gal-chip${isActive ? ' active' : ''}`}
            disabled={isDisabled}
            onClick={() => setParam(paramKey, isActive ? null : opt.value)}
          >
            {opt.label}
            <span style={{ opacity: 0.5 }}>{opt.count}</span>
          </button>
        );
      })}
    </div>
  );

  const activeIndustryLabel = activeIndustry ? INDUSTRY_LABELS[activeIndustry].label : null;
  const activeDiagramLabel = activeDiagram
    ? DIAGRAM_LABELS[activeDiagram]?.label ?? activeDiagram
    : null;

  return (
    <div
      className="sticky top-0 z-30 -mx-6 px-6 py-4 backdrop-blur-md"
      style={{
        borderBottom: '1px solid var(--fill-muted)',
        background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
      }}
    >
      <div className="mx-auto max-w-6xl flex flex-col gap-3">
        {/* Desktop: search */}
        <div
          className="hidden items-center gap-2 px-3 py-2 md:flex"
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

        {/* Mobile: one-line compact controls */}
        <div className="md:hidden flex flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={`gal-chip${activeFilterCount > 0 ? ' active' : ''}`}
              style={{ flexShrink: 0, height: 34, paddingInline: 10 }}
            >
              Filters
              {activeFilterCount > 0 && <span style={{ opacity: 0.7 }}>{activeFilterCount}</span>}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {mobileSearchOpen ? (
              <div
                className="flex min-w-0 flex-1 items-center gap-2 px-2.5"
                style={{
                  height: 34,
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
                  autoFocus
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="search…"
                  className="min-w-0 flex-1 bg-transparent font-mono text-xs focus:outline-none"
                  style={{ color: 'var(--text)' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (queryInput) setQueryInput('');
                    else setMobileSearchOpen(false);
                  }}
                  className="font-mono text-xs"
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                  aria-label={queryInput ? 'Clear search' : 'Close search'}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="inline-flex items-center justify-center"
                style={{
                  width: 34,
                  height: 34,
                  border: '1px solid var(--fill-muted)',
                  borderRadius: 'var(--r-sm)',
                  background: activeQuery ? 'var(--text)' : 'var(--bg)',
                  color: activeQuery ? 'var(--bg)' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
                aria-label="Search examples"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            )}

            <div
              className="ml-auto shrink-0 text-right font-mono text-xs leading-none"
              style={{ color: 'var(--text-muted)' }}
            >
              <span style={{ color: 'var(--text)' }}>{visibleCount}</span>
              <span className="ml-1 hidden min-[360px]:inline">results</span>
            </div>
          </div>

          {(activeIndustryLabel || activeDiagramLabel) && (
            <div
              className="flex gap-1.5 overflow-x-auto"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {activeIndustryLabel && (
                <button
                  type="button"
                  className="gal-chip active"
                  onClick={() => setParam('industry', null)}
                  style={{ flexShrink: 0 }}
                >
                  {activeIndustryLabel}
                  <span style={{ opacity: 0.7 }}>×</span>
                </button>
              )}
              {activeDiagramLabel && (
                <button
                  type="button"
                  className="gal-chip active"
                  onClick={() => setParam('type', null)}
                  style={{ flexShrink: 0 }}
                >
                  {activeDiagramLabel}
                  <span style={{ opacity: 0.7 }}>×</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop: USE-CASE chips */}
        <div className="hidden md:flex items-start gap-3">
          <span className="type-eye shrink-0" style={{ paddingTop: 6 }}>USE-CASE ·</span>
          {renderChipGroup(industryOptions, activeIndustry, 'industry')}
        </div>

        {/* Desktop: DIAGRAM chips */}
        <div className="hidden md:flex items-start gap-3">
          <span className="type-eye shrink-0" style={{ paddingTop: 6 }}>DIAGRAM ·</span>
          {renderChipGroup(diagramOptions, activeDiagram, 'type')}
        </div>

        {/* Status bar */}
        <div className="hidden items-center justify-between md:flex">
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

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(15, 23, 42, 0.45)' }}
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
          <div
            className="relative flex flex-col"
            style={{
              background: 'var(--bg)',
              borderTopLeftRadius: 'var(--r-md, 12px)',
              borderTopRightRadius: 'var(--r-md, 12px)',
              maxHeight: '85vh',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Filter gallery"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <span
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 999,
                  background: 'var(--fill-muted)',
                }}
              />
            </div>
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--fill-muted)' }}
            >
              <span className="type-eye">FILTERS</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="font-mono text-sm"
                style={{ color: 'var(--text-muted)', padding: '4px 8px' }}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="type-eye">USE-CASE</span>
                {renderChipGroup(industryOptions, activeIndustry, 'industry')}
              </div>
              <div className="flex flex-col gap-2">
                <span className="type-eye">DIAGRAM</span>
                {renderChipGroup(diagramOptions, activeDiagram, 'type')}
              </div>
            </div>
            {/* Footer */}
            <div
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ borderTop: '1px solid var(--fill-muted)' }}
            >
              <button
                type="button"
                onClick={clearAll}
                disabled={!hasActive}
                className="font-mono text-xs"
                style={{
                  color: hasActive ? 'var(--text-muted)' : 'var(--neutral)',
                  opacity: hasActive ? 1 : 0.5,
                }}
              >
                reset ×
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="gal-chip active"
                style={{ padding: '8px 18px' }}
              >
                Done · {visibleCount} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
