'use client';

import { useMemo, useState } from 'react';
import type { InteractiveCapabilities } from 'schematex';

export interface DiagramTypeOption {
  type: InteractiveCapabilities['type'];
  name: string;
  cluster: string;
  standard: string;
  starterDsl: string;
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
  dsl: string;
}

interface DiagramExampleBrowserProps {
  examples: DiagramExampleOption[];
  types: DiagramTypeOption[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: (type: DiagramTypeOption) => void;
  label?: string;
}

type BrowserView = 'type' | 'use-case';

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
  label = 'Diagram examples',
}: DiagramExampleBrowserProps) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<BrowserView>('type');
  const [group, setGroup] = useState('all');
  const [newOpen, setNewOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState('');
  const capabilityByType = useMemo(
    () => new Map(types.map((entry) => [entry.type, entry.capability])),
    [types],
  );
  const groups = useMemo(() => {
    const entries = view === 'type'
      ? examples.map((example) => ({ id: example.type, label: example.typeName }))
      : examples.flatMap((example) => example.useCases);
    return [...new Map(entries.map((entry) => [entry.id, entry])).values()]
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [examples, view]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return examples.filter((example) => {
      const inGroup = group === 'all' || (view === 'type'
        ? example.type === group
        : example.useCases.some((entry) => entry.id === group));
      const capability = capabilityByType.get(example.type);
      const haystack = [
        example.title,
        example.typeName,
        example.standard,
        example.note,
        capability?.reason,
        ...example.useCases.map((entry) => entry.label),
      ].filter(Boolean).join(' ').toLowerCase();
      return inGroup && (!needle || haystack.includes(needle));
    });
  }, [capabilityByType, examples, group, query, view]);
  const active = examples.find((example) => example.id === activeId) ?? examples[0];
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
            onClick={() => {
              setView(id);
              setGroup('all');
            }}
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
            placeholder="Search diagram or use case"
          />
        </label>
        <label>
          <span className="sr-only">Filter examples</span>
          <select value={group} onChange={(event) => setGroup(event.currentTarget.value)}>
            <option value="all">All {view === 'type' ? 'types' : 'use cases'}</option>
            {groups.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </label>
      </div>

      <label className="sx-example-mobile-select">
        <span className="sr-only">Choose an example</span>
        <select value={active?.id} onChange={(event) => onSelect(event.currentTarget.value)}>
          {filtered.map((example) => (
            <option key={example.id} value={example.id}>{mobileLabel(example)}</option>
          ))}
        </select>
      </label>

      <div className="sx-example-list" role="listbox" aria-label={label}>
        {filtered.map((example) => {
          const selected = example.id === active?.id;
          const capability = capabilityByType.get(example.type);
          return (
            <button
              key={example.id}
              type="button"
              role="option"
              data-example-id={example.id}
              aria-selected={selected}
              className="sx-example-option"
              onClick={() => onSelect(example.id)}
            >
              <span className="sx-example-option-type">{example.typeName} · § {example.standard}</span>
              <strong>{example.title}</strong>
              <small>{capability ? capabilityLabel(capability) : 'source editing'}</small>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="sx-example-empty">No matching specimen. Try a diagram name or published standard.</p>
        )}
      </div>

      {active?.note && <p className="sx-example-note">{active.note}</p>}
    </aside>
  );
}
