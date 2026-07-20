'use client';

import { useMemo } from 'react';
import { getInteractiveCapabilities } from 'schematex';
import type { DiagramExampleOption } from './DiagramExampleBrowser';

export type BrowserView = 'type' | 'use-case';

export interface GroupBucket {
  id: string;
  label: string;
  /** Only set when grouping by type — the header then carries the citation. */
  standard?: string;
  items: DiagramExampleOption[];
}

/** Shared search, grouping, and ordering for the specimen rail and ⌘K palette. */
export function useGroupedExamples(
  examples: DiagramExampleOption[],
  view: BrowserView,
  query: string,
) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return examples;
    return examples.filter((example) => {
      const capability = getInteractiveCapabilities(example.type);
      const haystack = [
        example.title,
        example.typeName,
        example.standard,
        example.note,
        capability.reason,
        ...example.useCases.map((entry) => entry.label),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [examples, query]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, GroupBucket>();
    for (const example of filtered) {
      const keys: Array<{ id: string; label: string; standard?: string }> = view === 'type'
        ? [{ id: example.type, label: example.typeName, standard: example.standard }]
        : example.useCases.length > 0
          ? example.useCases
          : [{ id: 'other', label: 'Other' }];
      for (const key of keys) {
        const bucket = buckets.get(key.id)
          ?? { id: key.id, label: key.label, standard: key.standard, items: [] };
        bucket.items.push(example);
        buckets.set(key.id, bucket);
      }
    }
    return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered, view]);

  return { filtered, grouped };
}
