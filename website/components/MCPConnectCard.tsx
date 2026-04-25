import { CopyButton } from '@/components/CopyButton';

const MCP_URL = 'https://schematex.js.org/mcp';
const CLAUDE_CONNECTOR_URL =
  'https://claude.ai/settings/connectors?modal=add-custom-connector';

interface MCPConnectCardProps {
  /** `full` (default) for hero CTAs at top/bottom of long pages. `compact` for inline mentions. */
  size?: 'full' | 'compact';
  /** Override the headline (full only). */
  title?: string;
  /** Override the supporting line (full only). */
  description?: string;
}

/**
 * Two-action call-to-action for connecting Schematex's hosted MCP to Claude.ai.
 *
 * Layout: a copyable URL on the left, a primary "Open in Claude.ai" button
 * on the right. Sits side-by-side on desktop, stacks on mobile.
 *
 * - `full` size — wraps in a soft card with title/description/help text.
 *   Used at the top and bottom of `/docs/ai-integration`.
 * - `compact` size — bare action row, no card chrome. Used inline on
 *   `/docs` (Introduction) and `/docs/getting-started`.
 */
export function MCPConnectCard({
  size = 'full',
  title = 'Connect to Claude in 10 seconds',
  description = 'Schematex ships a hosted MCP server. Add it to Claude.ai once and every chat can generate validated, standards-compliant diagrams.',
}: MCPConnectCardProps) {
  const isFull = size === 'full';

  const actionRow = (
    <div className="not-prose flex flex-col sm:flex-row sm:items-stretch gap-2">
      {/* URL — copyable. Click anywhere on the pill to copy. */}
      <CopyURLPill />

      {/* Primary CTA — opens Claude.ai connector dialog. Claude brand orange. */}
      <a
        href={CLAUDE_CONNECTOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mcp-connect-cta inline-flex items-center justify-center gap-1 font-medium transition no-underline"
        style={{
          background: '#D97757',
          color: '#ffffff',
          padding: '6px 11px',
          borderRadius: 'var(--r-sm)',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          lineHeight: 1.2,
        }}
      >
        <span>Open in Claude</span>
        <ArrowIcon />
      </a>
    </div>
  );

  if (!isFull) {
    return <div className="my-5">{actionRow}</div>;
  }

  return (
    <div
      className="not-prose my-6"
      style={{
        background: 'var(--fill-muted)',
        borderRadius: 'var(--r-md, 8px)',
        padding: '20px 22px',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
          marginBottom: '4px',
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: '13.5px',
          color: 'var(--text-muted)',
          margin: 0,
          marginBottom: '14px',
          lineHeight: 1.55,
        }}
      >
        {description}
      </p>

      {actionRow}

      <p
        style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          margin: 0,
          marginTop: '12px',
          lineHeight: 1.5,
        }}
      >
        One click to open the connector dialog. Paste the URL, click{' '}
        <strong style={{ color: 'var(--text)' }}>Add</strong>. Works on every
        Claude.ai plan.
      </p>
    </div>
  );
}

/**
 * URL "chip" — monospace URL with a copy button inline. Single bordered pill,
 * no nested boxes. The whole thing reads as one visual unit.
 */
function CopyURLPill() {
  return (
    <div
      className="flex items-center justify-between gap-2 flex-1 min-w-0"
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--fill-muted)',
        borderRadius: 'var(--r-sm)',
        padding: '8px 6px 8px 14px',
        minHeight: '40px',
      }}
    >
      <code
        className="font-mono truncate"
        style={{
          fontSize: '13px',
          color: 'var(--text)',
          background: 'transparent',
          padding: 0,
          border: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {MCP_URL}
      </code>
      <CopyButton text={MCP_URL} variant="ghost" label="Copy" />
    </div>
  );
}


function ArrowIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
