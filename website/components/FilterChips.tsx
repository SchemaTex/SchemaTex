'use client';

interface FilterOption {
  value: string;
  label: string;
  count: number;
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
      <div className="text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = selected === opt.value;
          const isDisabled = opt.count === 0;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(isActive ? null : opt.value)}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ' +
                (isActive
                  ? 'border-fd-primary bg-fd-primary text-fd-primary-foreground shadow-sm'
                  : isDisabled
                    ? 'cursor-not-allowed border-fd-border/50 bg-fd-card/50 text-fd-muted-foreground/40'
                    : 'border-fd-border bg-fd-card text-fd-muted-foreground hover:border-fd-primary/60 hover:text-fd-foreground')
              }
            >
              {opt.icon && <span className="leading-none">{opt.icon}</span>}
              <span>{opt.label}</span>
              <span
                className={
                  'rounded px-1 text-[10px] font-semibold tabular-nums ' +
                  (isActive
                    ? 'bg-white/20 text-fd-primary-foreground'
                    : 'bg-fd-muted/60 text-fd-muted-foreground/80')
                }
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
