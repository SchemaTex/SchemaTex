'use client';

interface FilterOption {
  value: string;
  label: string;
  count: number;
  /** Optional category color — renders a DS 8x8 swatch before the label. */
  color?: string;
  /** Optional emoji/icon fallback (kept for industry / complexity). */
  icon?: string;
}

interface FilterChipsProps {
  label: string;
  options: FilterOption[];
  selected: string | null;
  onChange: (value: string | null) => void;
}

export function FilterChips({ label, options, selected, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="type-eye">{label}</div>
      <div
        className="flex flex-wrap items-center gap-1 p-1"
        style={{
          background: 'var(--fill)',
          border: '1px solid var(--fill-muted)',
          borderRadius: 'var(--r)',
        }}
      >
        {options.map((opt) => {
          const isActive = selected === opt.value;
          const isDisabled = opt.count === 0;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(isActive ? null : opt.value)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderRadius: 'var(--r-sm)',
                border: '1px solid transparent',
                background: isActive ? 'var(--text)' : 'transparent',
                color: isActive ? 'var(--bg)' : 'var(--text-muted)',
              }}
            >
              {opt.color && (
                <span
                  aria-hidden
                  className="inline-block size-2"
                  style={{ background: opt.color, borderRadius: 2 }}
                />
              )}
              {!opt.color && opt.icon && (
                <span aria-hidden className="leading-none">
                  {opt.icon}
                </span>
              )}
              <span>{opt.label}</span>
              <span
                className="tabular-nums"
                style={{
                  fontSize: 10,
                  opacity: isActive ? 0.7 : 0.6,
                }}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
