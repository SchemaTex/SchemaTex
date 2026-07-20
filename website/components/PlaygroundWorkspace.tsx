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
  initialDsl: string;
}

const SIDEBAR_STORAGE_KEY = 'schematex:playground:sidebar-collapsed';

export function PlaygroundWorkspace({ examples, types, initialId, initialDsl }: PlaygroundWorkspaceProps) {
  const resolvedInitialId = initialId
    ? (examples.some((example) => example.id === initialId) ? initialId : examples[0]?.id ?? '')
    : '';
  const [activeId, setActiveId] = useState(resolvedInitialId);
  const [activeSource, setActiveSource] = useState(initialDsl);
  const [draft, setDraft] = useState<DiagramExampleOption | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const commandTriggerRef = useRef<HTMLElement | null>(null);
  const sourceCacheRef = useRef(new Map<string, string>(
    resolvedInitialId ? [[resolvedInitialId, initialDsl]] : [],
  ));
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
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
    // Capture phase + stopImmediatePropagation so fumadocs' global search
    // hotkey — bound on window by <RootProvider> in app/layout.tsx — never
    // also fires. Without this, ⌘K opens both this palette and the docs
    // search dialog at once, and the docs dialog steals focus. Capture runs
    // before any bubble listener, so we intercept only the two keys we own
    // and leave everything else (⌘F, ⌘C, plain typing) untouched. Docs pages
    // keep their ⌘K search because this listener only mounts on the playground.
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === '\\') {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleSidebar();
      } else if (key === 'k') {
        event.preventDefault();
        event.stopImmediatePropagation();
        commandTriggerRef.current = document.querySelector<HTMLButtonElement>('.pg-library-action');
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [toggleSidebar]);

  const openLibrary = useCallback((trigger: HTMLButtonElement) => {
    commandTriggerRef.current = trigger;
    setCommandOpen(true);
  }, []);

  const writeExampleUrl = useCallback((id: string) => {
    const url = new URL(window.location.href);
    if (id.startsWith('new:')) url.searchParams.delete('example');
    else url.searchParams.set('example', id);
    url.hash = '';
    window.history.replaceState(null, '', url);
  }, []);

  const beginRequest = useCallback(() => {
    const requestId = ++requestIdRef.current;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setLoadingId(null);
    setLoadError(null);
    return requestId;
  }, []);

  const loadSource = useCallback(async (slug: string, requestId: number) => {
    let source = sourceCacheRef.current.get(slug);
    if (source === undefined) {
      setLoadingId(slug);
      const controller = new AbortController();
      requestControllerRef.current = controller;
      try {
        const response = await fetch(`/api/playground-example/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Example request failed with ${response.status}.`);
        source = await response.text();
        sourceCacheRef.current.set(slug, source);
      } catch {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return null;
        setLoadError('Could not load this specimen. Check the connection and try again.');
        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          requestControllerRef.current = null;
          setLoadingId(null);
        }
      }
    }
    return requestId === requestIdRef.current ? source : null;
  }, []);

  const selectExample = useCallback(async (id: string) => {
    if (id === activeId) {
      // Clicking the still-active specimen while another source is loading is
      // a natural cancel action; keep its edited source instead of reloading it.
      if (requestControllerRef.current) beginRequest();
      return;
    }
    const requestId = beginRequest();
    const source = await loadSource(id, requestId);
    if (source === null || source === undefined) return;
    setActiveId(id);
    setActiveSource(source);
    writeExampleUrl(id);
  }, [activeId, beginRequest, loadSource, writeExampleUrl]);

  const newDiagram = useCallback(async (entry: DiagramTypeOption) => {
    const requestId = beginRequest();
    const source = entry.starterSlug
      ? await loadSource(entry.starterSlug, requestId)
      : entry.type;
    if (source === null || requestId !== requestIdRef.current) return;
    const next: DiagramExampleOption = {
      id: `new:${entry.type}`,
      title: `New ${entry.name}`,
      type: entry.type,
      typeName: entry.name,
      cluster: entry.cluster,
      standard: entry.standard,
      useCases: [],
      note: entry.capability.reason,
    };
    sourceCacheRef.current.set(next.id, source);
    setDraft(next);
    setActiveId(next.id);
    setActiveSource(source);
    setLoadingId(null);
    setLoadError(null);
    writeExampleUrl(next.id);
  }, [beginRequest, loadSource, writeExampleUrl]);

  useEffect(() => () => {
    ++requestIdRef.current;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
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
          loadingId={loadingId}
          loadError={loadError}
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
          initial={activeSource}
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
