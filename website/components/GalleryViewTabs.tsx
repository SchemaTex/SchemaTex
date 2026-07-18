import Link from 'next/link';

export type GalleryView = 'usecase' | 'type';

const TABS: { view: GalleryView; href: string; label: string; hint: string }[] = [
  { view: 'usecase', href: '/gallery', label: 'By use-case', hint: 'browse & filter by industry' },
  { view: 'type', href: '/gallery?view=type', label: 'By diagram type', hint: 'every type, every form' },
];

export function GalleryViewTabs({ active }: { active: GalleryView }) {
  return (
    <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--line)' }}>
      {TABS.map((t) => {
        const on = t.view === active;
        return (
          <Link
            key={t.view}
            href={t.href}
            title={t.hint}
            className="rounded-md px-3 py-1.5 text-[13px] font-medium transition"
            style={
              on
                ? { background: 'var(--accent)', color: 'var(--bg)' }
                : { color: 'var(--text-muted)' }
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
