'use client';

import { useMemo, useState } from 'react';

export interface DiagramExampleOption {
  id: string;
  title: string;
  type: string;
  group: string;
  status: string;
  note?: string;
  dsl: string;
}

interface DiagramExampleBrowserProps {
  examples: DiagramExampleOption[];
  activeId: string;
  onSelect: (id: string) => void;
  label?: string;
}

export function DiagramExampleBrowser({
  examples,
  activeId,
  onSelect,
  label = 'Diagram examples',
}: DiagramExampleBrowserProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const groups = useMemo(
    () => [...new Set(examples.map((example) => example.group))].sort(),
    [examples],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return examples.filter((example) =>
      (group === 'all' || example.group === group) &&
      (!needle || `${example.title} ${example.type} ${example.status} ${example.note ?? ''}`
        .toLowerCase()
        .includes(needle)),
    );
  }, [examples, group, query]);
  const active = examples.find((example) => example.id === activeId) ?? examples[0];
  const mobileLabel = (example: DiagramExampleOption) =>
    example.title.toLowerCase().startsWith(example.type.toLowerCase())
      ? example.title
      : `${example.type} · ${example.title}`;

  return (
    <aside className="sx-example-browser" aria-label={label}>
      <div className="sx-example-browser-heading">
        <div>
          <span className="type-eye">SPECIMEN LIBRARY</span>
          <strong>{examples.length} editable examples</strong>
        </div>
        <span className="sx-example-count">{filtered.length}</span>
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
          <span className="sr-only">Filter example group</span>
          <select value={group} onChange={(event) => setGroup(event.currentTarget.value)}>
            <option value="all">All groups</option>
            {groups.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
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
              <span className="sx-example-option-type">{example.type}</span>
              <strong>{example.title}</strong>
              <small>{example.status}</small>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="sx-example-empty">No matching specimen. Try a diagram name such as “floorplan”.</p>
        )}
      </div>

      {active?.note && <p className="sx-example-note">{active.note}</p>}
    </aside>
  );
}
