import Link from 'next/link';

interface ClusterCardProps {
  icon: string;
  title: string;
  description: string;
  diagrams: string[];
  href: string;
  svg: string;
  accent: string; // tailwind gradient classes, e.g. "from-blue-500/10 to-transparent"
}

export function ClusterCard({
  icon,
  title,
  description,
  diagrams,
  href,
  svg,
  accent,
}: ClusterCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-fd-border bg-fd-card transition-all hover:-translate-y-0.5 hover:border-fd-foreground/20 hover:shadow-xl hover:shadow-black/[0.04] dark:hover:shadow-black/40"
    >
      {/* Subtle gradient wash */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -inset-px -z-0 bg-gradient-to-br ${accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
      />

      {/* Preview */}
      <div className="relative flex h-[220px] items-center justify-center overflow-hidden bg-white p-6">
        <div
          className="[&_svg]:max-h-full [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Body */}
      <div className="relative z-10 flex flex-1 flex-col border-t border-fd-border p-6">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="text-2xl leading-none" aria-hidden>
            {icon}
          </span>
          <h3 className="text-lg font-semibold tracking-tight text-fd-foreground">
            {title}
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-fd-muted-foreground">
          {description}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {diagrams.map((d) => (
            <span
              key={d}
              className="rounded-md border border-fd-border bg-fd-background px-2 py-0.5 text-xs text-fd-muted-foreground"
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
