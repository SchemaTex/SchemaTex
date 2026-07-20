'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { DiagramExampleOption } from './DiagramExampleBrowser';
import { useGroupedExamples } from './useGroupedExamples';

interface CommandPaletteProps {
  examples: DiagramExampleOption[];
  activeId: string;
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function CommandPalette({
  examples,
  activeId,
  open,
  returnFocusRef,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { grouped } = useGroupedExamples(examples, 'type', query);
  const options = useMemo(() => grouped.flatMap((bucket) => bucket.items), [grouped]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setHighlighted(Math.max(0, optionsRef.current.findIndex((example) => example.id === activeId)));
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [activeId, open, returnFocusRef]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    const option = options[highlighted];
    if (!open || !option) return;
    listRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(`sx-command-option-${option.id}`)}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open, options]);

  if (!open) return null;

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length === 0) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setHighlighted((index) => (index + direction + options.length) % options.length);
      return;
    }
    if (event.key === 'Enter' && options[highlighted]) {
      event.preventDefault();
      choose(options[highlighted].id);
    }
  };

  let optionIndex = -1;
  return (
    <div
      className="sx-command-palette-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sx-command-palette" role="dialog" aria-modal="true" aria-label="Browse diagram examples">
        <div className="sx-command-palette-search">
          <span aria-hidden>⌕</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder="Search diagrams, standards, or use cases"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="sx-command-palette-list"
            aria-activedescendant={options[highlighted] ? `sx-command-option-${options[highlighted].id}` : undefined}
          />
          <span className="sx-command-palette-esc">esc</span>
        </div>
        <div ref={listRef} id="sx-command-palette-list" className="sx-command-palette-list" role="listbox">
          {grouped.map((bucket) => (
            <div key={bucket.id} role="group" aria-label={bucket.label} className="sx-command-palette-group">
              <div className="sx-command-palette-heading">
                <span>{bucket.label}</span>
                {bucket.standard && <span>· § {bucket.standard}</span>}
                <b>{bucket.items.length}</b>
              </div>
              {bucket.items.map((example) => {
                optionIndex += 1;
                const index = optionIndex;
                const isHighlighted = index === highlighted;
                return (
                  <button
                    key={example.id}
                    id={`sx-command-option-${example.id}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={example.id === activeId}
                    data-highlighted={isHighlighted ? 'true' : 'false'}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => choose(example.id)}
                  >
                    <span aria-hidden>{isHighlighted ? '▸' : ''}</span>
                    <strong>{example.title}</strong>
                  </button>
                );
              })}
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="sx-command-palette-empty">No matching specimen. Try a diagram name or published standard.</p>
          )}
        </div>
      </div>
    </div>
  );
}
