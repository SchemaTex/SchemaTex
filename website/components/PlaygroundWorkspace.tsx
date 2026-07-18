'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DiagramExampleBrowser,
  type DiagramExampleOption,
  type DiagramTypeOption,
} from './DiagramExampleBrowser';
import { Playground } from './Playground';

interface PlaygroundWorkspaceProps {
  examples: DiagramExampleOption[];
  types: DiagramTypeOption[];
  initialId?: string;
}

const SIDEBAR_STORAGE_KEY = 'schematex:playground:sidebar-collapsed';

export function PlaygroundWorkspace({ examples, types, initialId }: PlaygroundWorkspaceProps) {
  const fallbackId = examples[0]?.id ?? '';
  const resolvedInitialId = initialId && examples.some((example) => example.id === initialId)
    ? initialId
    : fallbackId;
  const [activeId, setActiveId] = useState(resolvedInitialId);
  const [draft, setDraft] = useState<DiagramExampleOption | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const availableExamples = useMemo(
    () => draft ? [draft, ...examples] : examples,
    [draft, examples],
  );
  const active = useMemo(
    () => availableExamples.find((example) => example.id === activeId) ?? availableExamples[0],
    [activeId, availableExamples],
  );

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== '\\') return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const selectExample = useCallback((id: string) => {
    setActiveId(id);
    const url = new URL(window.location.href);
    if (id.startsWith('new:')) url.searchParams.delete('example');
    else url.searchParams.set('example', id);
    url.hash = '';
    window.history.replaceState(null, '', url);
  }, []);

  const newDiagram = useCallback((entry: DiagramTypeOption) => {
    const next: DiagramExampleOption = {
      id: `new:${entry.type}`,
      title: `New ${entry.name}`,
      type: entry.type,
      typeName: entry.name,
      cluster: entry.cluster,
      standard: entry.standard,
      useCases: [],
      note: entry.capability.reason,
      dsl: entry.starterDsl,
    };
    setDraft(next);
    setActiveId(next.id);
    const url = new URL(window.location.href);
    url.searchParams.delete('example');
    url.hash = '';
    window.history.replaceState(null, '', url);
  }, []);

  if (!active) return null;

  return (
    <section
      className="sx-playground-workspace"
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
      aria-label="Schematex diagram editor"
    >
      <div className="sx-playground-sidebar">
        <DiagramExampleBrowser
          examples={availableExamples}
          types={types}
          activeId={active.id}
          onSelect={selectExample}
          onNew={newDiagram}
        />
      </div>
      <button
        type="button"
        className="sx-sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Show specimen library' : 'Hide specimen library'}
        aria-expanded={!sidebarCollapsed}
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>
      <div className="min-h-0 min-w-0">
        <Playground
          initial={active.dsl}
          fill
          syncHash
          types={types}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
      </div>
    </section>
  );
}
