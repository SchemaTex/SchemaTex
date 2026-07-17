'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DiagramExampleBrowser,
  type DiagramExampleOption,
} from './DiagramExampleBrowser';
import { Playground } from './Playground';

interface PlaygroundWorkspaceProps {
  examples: DiagramExampleOption[];
  initialId?: string;
  stars?: number;
}

export function PlaygroundWorkspace({ examples, initialId, stars = 0 }: PlaygroundWorkspaceProps) {
  const fallbackId = examples[0]?.id ?? '';
  const resolvedInitialId = initialId && examples.some((example) => example.id === initialId)
    ? initialId
    : fallbackId;
  const [activeId, setActiveId] = useState(resolvedInitialId);
  const active = useMemo(
    () => examples.find((example) => example.id === activeId) ?? examples[0],
    [activeId, examples],
  );

  const selectExample = useCallback((id: string) => {
    setActiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('example', id);
    url.hash = '';
    window.history.replaceState(null, '', url);
  }, []);

  if (!active) return null;

  return (
    <div className="sx-playground-workspace">
      <DiagramExampleBrowser examples={examples} activeId={active.id} onSelect={selectExample} />
      <div className="min-w-0">
        <Playground initial={active.dsl} height={720} syncHash stars={stars} />
      </div>
    </div>
  );
}
