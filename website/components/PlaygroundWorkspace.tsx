'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DiagramExampleBrowser,
  type DiagramExampleOption,
  type DiagramTypeOption,
} from './DiagramExampleBrowser';
import { Playground } from './Playground';
import { CommandPalette } from './CommandPalette';

interface PlaygroundWorkspaceProps {
  examples: DiagramExampleOption[];
  types: DiagramTypeOption[];
  initialId?: string;
}

const SIDEBAR_STORAGE_KEY = 'schematex:playground:sidebar-collapsed';

export function PlaygroundWorkspace({ examples, types, initialId }: PlaygroundWorkspaceProps) {
  const resolvedInitialId = initialId
    ? (examples.some((example) => example.id === initialId) ? initialId : examples[0]?.id ?? '')
    : '';
  const [activeId, setActiveId] = useState(resolvedInitialId);
  const [draft, setDraft] = useState<DiagramExampleOption | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const commandTriggerRef = useRef<HTMLElement | null>(null);
  const availableExamples = useMemo(
    () => draft ? [draft, ...examples] : examples,
    [draft, examples],
  );
  const active = useMemo(
    () => availableExamples.find((example) => example.id === activeId),
    [activeId, availableExamples],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true');
      return;
    }
    setSidebarCollapsed(true);
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
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === '\\') {
        event.preventDefault();
        toggleSidebar();
      }
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        commandTriggerRef.current = document.querySelector<HTMLButtonElement>('.pg-library-action');
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const openLibrary = useCallback((trigger: HTMLButtonElement) => {
    commandTriggerRef.current = trigger;
    setCommandOpen(true);
  }, []);

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
          activeId={active?.id ?? ''}
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
          initial={active?.dsl ?? ''}
          fill
          syncHash
          types={types}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onOpenLibrary={openLibrary}
          emptyExampleCount={active ? undefined : examples.length}
        />
      </div>
      <CommandPalette
        examples={availableExamples}
        activeId={active?.id ?? ''}
        open={commandOpen}
        returnFocusRef={commandTriggerRef}
        onClose={() => setCommandOpen(false)}
        onSelect={selectExample}
      />
    </section>
  );
}
