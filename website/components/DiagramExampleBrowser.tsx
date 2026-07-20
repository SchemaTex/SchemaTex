'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { InteractiveCapabilities } from 'schematex';
import { useGroupedExamples, type BrowserView } from './useGroupedExamples';

export interface DiagramTypeOption {
  type: InteractiveCapabilities['type'];
  name: string;
  cluster: string;
  standard: string;
  standardAlso?: readonly string[];
  starterSlug?: string;
  capability: InteractiveCapabilities;
}

export interface DiagramExampleOption {
  id: string;
  title: string;
  type: InteractiveCapabilities['type'];
  typeName: string;
  cluster: string;
  standard: string;
  useCases: Array<{ id: string; label: string }>;
  note?: string;
}

interface DiagramExampleBrowserProps {
  examples: DiagramExampleOption[];
  types: DiagramTypeOption[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: (type: DiagramTypeOption) => void;
  loadingId?: string | null;
  loadError?: string | null;
  label?: string;
}

function positionLabel(position: InteractiveCapabilities['position']): string {
  switch (position) {
    case 'free': return 'free move';
    case 'move-x': return 'horizontal move';
    case 'move-y': return 'vertical move';
    case 'cross-axis': return 'cross-axis move';
    case 'native-x': return 'native x handles';
    case 'native-y': return 'native y handles';
    case 'native-xy': return 'native xy handles';
    default: return 'position locked';
  }
}

function capabilityLabel(capability: InteractiveCapabilities): string {
  const text = capability.text.length > 0 ? capability.text.join(' + ') : 'source editing';
  return capability.position === 'none' ? text : `${text} · ${positionLabel(capability.position)}`;
}

export function DiagramExampleBrowser({
  examples,
  types,
  activeId,
  onSelect,
  onNew,
  loadingId = null,
  loadError = null,
  label = 'Diagram examples',
}: DiagramExampleBrowserProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<BrowserView>('type');
  const [newOpen, setNewOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState('');
  const capabilityByType = useMemo(
    () => new Map(types.map((entry) => [entry.type, entry.capability])),
    [types],
  );
  const { filtered, grouped } = useGroupedExamples(examples, view, query);
  const active = examples.find((example) => example.id === activeId);
  const listRef = useRef<HTMLDivElement>(null);
  // Grouping means the active specimen is rarely near the top any more — a
  // `?example=` deep link would otherwise land on an unrelated group.
  useEffect(() => {
    if (!active) return;
    const option = listRef.current?.querySelector<HTMLElement>(`[data-example-id="${CSS.escape(active.id)}"]`);
    option?.scrollIntoView({ block: 'nearest' });
  }, [active, view]);
  const matchingTypes = useMemo(() => {
    const needle = typeQuery.trim().toLowerCase();
    return types.filter((entry) => !needle || [
      entry.name,
      entry.type,
      entry.standard,
      entry.cluster,
      entry.capability.reason,
    ].filter(Boolean).join(' ').toLowerCase().includes(needle));
  }, [typeQuery, types]);
  const mobileLabel = (example: DiagramExampleOption) =>
    example.title.toLowerCase().startsWith(example.typeName.toLowerCase())
      ? example.title
      : `${example.typeName} · ${example.title}`;

  return (
    <aside className="sx-example-browser" aria-label={label}>
      <div className="sx-example-browser-heading">
        <div>
          <span className="type-eye">SPECIMENS</span>
          <strong>{examples.length} validated examples</strong>
        </div>
        <button type="button" className="sx-new-diagram" onClick={() => setNewOpen((open) => !open)}>
          ＋ New diagram
        </button>
      </div>

      {loadError && <p className="sx-example-load-error" role="alert">{loadError}</p>}

      {newOpen && (
        <div className="sx-new-diagram-panel">
          <label>
            <span className="sr-only">Search diagram types</span>
            <input
              type="search"
              value={typeQuery}
              onChange={(event) => setTypeQuery(event.currentTarget.value)}
              placeholder="Type or standard"
              autoFocus
            />
          </label>
          <div className="sx-new-diagram-list">
            {matchingTypes.map((entry) => (
              <button
                key={entry.type}
                type="button"
                onClick={() => {
                  onNew(entry);
                  setNewOpen(false);
                  setTypeQuery('');
                }}
              >
                <span>{entry.name}</span>
                <small>§ {entry.standard}</small>
                <em>{capabilityLabel(entry.capability)}</em>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sx-example-view-tabs" role="tablist" aria-label="Group examples">
        {([
          ['type', 'By type'],
          ['use-case', 'Use case'],
        ] as const).map(([id, text]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="sx-example-controls">
        <label>
          <span className="sr-only">Search examples</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search diagram, standard, or use case"
          />
        </label>
      </div>

      <label className="sx-example-mobile-select">
        <span className="sr-only">Choose an example</span>
        <select value={active?.id ?? ''} onChange={(event) => onSelect(event.currentTarget.value)}>
          {!active && <option value="" disabled>Choose an example</option>}
          {filtered.map((example) => (
            <option key={example.id} value={example.id}>{mobileLabel(example)}</option>
          ))}
        </select>
      </label>

      <div className="sx-example-list" role="listbox" aria-label={label} ref={listRef}>
        {grouped.map((bucket) => (
          <div key={bucket.id} role="group" aria-label={bucket.label} className="sx-example-group">
            <div className="sx-example-group-heading">
              <span className="sx-example-group-label">{bucket.label}</span>
              {bucket.standard && (
                <span className="sx-example-group-standard" title={bucket.standard}>
                  § {bucket.standard}
                </span>
              )}
              <span className="sx-example-group-count">{bucket.items.length}</span>
            </div>
            {bucket.items.map((example) => {
              const selected = example.id === active?.id;
              const capability = capabilityByType.get(example.type);
              return (
                <button
                  key={`${bucket.id}:${example.id}`}
                  type="button"
                  role="option"
                  data-example-id={example.id}
                  aria-selected={selected}
                  aria-busy={loadingId === example.id}
                  className="sx-example-option"
                  onClick={() => onSelect(example.id)}
                >
                  <strong>{example.title}</strong>
                  <small>
                    {/* Grouping by type already states the type in the header. */}
                    {loadingId === example.id
                      ? 'Loading source…'
                      : <>
                          {view === 'type' ? '' : `${example.typeName} · `}
                          {capability ? capabilityLabel(capability) : 'source editing'}
                        </>}
                  </small>
                </button>
              );
            })}
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="sx-example-empty">No matching specimen. Try a diagram name or published standard.</p>
        )}
      </div>

      {active?.note && <p className="sx-example-note">{active.note}</p>}
    </aside>
  );
}
