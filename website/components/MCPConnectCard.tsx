import { CopyButton } from '@/components/CopyButton';

const MCP_URL = 'https://schematex.js.org/mcp';
const CLAUDE_CONNECTOR_URL =
  'https://claude.ai/settings/connectors?modal=add-custom-connector';

interface MCPConnectCardProps {
  /** `full` (default) for hero CTAs at top/bottom of long pages. `compact` for inline mentions. */
  size?: 'full' | 'compact';
  /** Override the headline. */
  title?: string;
  /** Override the supporting line. */
  description?: string;
}

/**
 * Two-action call-to-action for connecting Schematex's hosted MCP to Claude.ai.
 * - Left: copyable MCP URL.
 * - Right: deep link that opens Claude.ai's "Add custom connector" dialog.
 *
 * Used on `/docs/ai-integration` (full), `/docs/getting-started` (compact),
 * and `/docs` introduction (compact).
 */
export function MCPConnectCard({
  size = 'full',
  title = 'Connect to Claude in 10 seconds',
  description = 'Schematex ships a hosted MCP server. Add it to Claude.ai once and every chat can generate validated, standards-compliant diagrams.',
}: MCPConnectCardProps) {
  const isFull = size === 'full';

  return (
    <div
      className="not-prose my-6"
      style={{
        border: '1px solid var(--stroke)',
        borderRadius: 'var(--r-md)',
        background: 'var(--fill)',
        padding: isFull ? '24px' : '16px',
      }}
    >
      {isFull && (
        <>
          <div
            className="font-semibold"
            style={{
              fontSize: '17px',
              color: 'var(--ink)',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </div>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--ink-muted)',
              margin: 0,
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </>
      )}

      <div
        className="flex flex-col md:flex-row md:items-stretch"
        style={{ gap: '10px' }}
      >
        {/* URL pill + copy */}
        <div
          className="flex items-center justify-between gap-2 flex-1 min-w-0"
          style={{
            border: '1px solid var(--fill-muted)',
            borderRadius: 'var(--r-sm)',
            background: 'var(--bg)',
            padding: '8px 10px 8px 14px',
          }}
        >
          <code
            className="font-mono truncate"
            style={{
              fontSize: '13px',
              color: 'var(--ink)',
              background: 'transparent',
              padding: 0,
              border: 0,
            }}
          >
            {MCP_URL}
          </code>
          <CopyButton text={MCP_URL} variant="ghost" label="Copy URL" />
        </div>

        {/* Open Claude.ai button */}
        <a
          href={CLAUDE_CONNECTOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 font-medium transition hover:opacity-90"
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            padding: '10px 16px',
            borderRadius: 'var(--r-sm)',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
        >
          <ClaudeIcon />
          Open in Claude.ai
          <ArrowIcon />
        </a>
      </div>

      {isFull && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--ink-muted)',
            margin: 0,
            marginTop: '14px',
            lineHeight: 1.5,
          }}
        >
          Click <strong>Open in Claude.ai</strong> → the connector dialog opens
          with the URL field empty → paste the URL above → click <strong>Add</strong>.
          Works on Free / Pro / Team / Enterprise.
        </p>
      )}
    </div>
  );
}

function ClaudeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
