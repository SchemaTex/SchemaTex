import Link from 'next/link';
import type { Metadata } from 'next';
import { DiagramIcon } from '@/components/DiagramIcon';
import { getSymbolCatalog, SYMBOL_CATALOG_TYPES, type SymbolCatalog } from 'schematex';
import { getDiagramMeta } from 'schematex/ai';

const catalogs = SYMBOL_CATALOG_TYPES
  .map((t) => getSymbolCatalog(t))
  .filter((c): c is SymbolCatalog => c !== null);

const totalSymbols = catalogs.reduce((n, c) => n + c.entries.length, 0);

export const metadata: Metadata = {
  title: 'Symbols — the real symbol libraries Schematex renders inside diagrams',
  description: `${totalSymbols} standards-correct domain symbols across ${catalogs.length} diagram types — IEEE 315 circuit components, single-line apparatus, ISA-5.1 P&ID equipment, and flowchart node icons. Every symbol the engines actually draw.`,
  alternates: { canonical: 'https://schematex.js.org/icons' },
};

export default function IconsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b px-6 pb-8 pt-12" style={{ borderColor: 'var(--line)' }}>
        <div className="mx-auto max-w-6xl">
          <p className="type-eye mb-3">/ SYMBOLS</p>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="ds-badge">{totalSymbols} symbols</span>
            <span className="ds-badge">{catalogs.length} libraries</span>
          </div>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
            The symbols our engines actually draw.
          </h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
            The standards-correct domain symbols Schematex renders <em>inside</em> diagrams —
            circuit components, single-line apparatus, P&amp;ID equipment, flowchart node icons.
            Every glyph here is produced by the real engine, not a separate icon font.
          </p>

          <nav className="mt-6 flex flex-wrap gap-2">
            {catalogs.map((c) => (
              <a key={c.type} href={`#${c.type}`} className="ds-badge inline-flex items-center gap-1.5 hover:border-[color:var(--accent)]">
                <DiagramIcon type={c.type} size={13} />
                {getDiagramMeta(c.type)?.name ?? c.type} <span style={{ opacity: 0.5 }}>{c.entries.length}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          {catalogs.map((c) => (
            <CatalogSection key={c.type} catalog={c} />
          ))}
        </div>
      </section>
    </main>
  );
}

function CatalogSection({ catalog }: { catalog: SymbolCatalog }) {
  const meta = getDiagramMeta(catalog.type);
  return (
    <div id={catalog.type} className="scroll-mt-20 pt-14">
      <div className="mb-1 flex flex-wrap items-center gap-2.5 border-b pb-3" style={{ borderColor: 'var(--line)' }}>
        <DiagramIcon type={catalog.type} size={20} style={{ color: 'var(--accent)' }} />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{meta?.name ?? catalog.label}</h2>
        <span className="ds-badge">{catalog.entries.length} symbols</span>
        <Link href={`/docs/${meta?.syntaxKey ?? catalog.type}`} className="ml-auto font-mono text-[11px] hover:text-[color:var(--accent)]" style={{ color: 'var(--text-muted)' }}>
          Docs →
        </Link>
      </div>
      <p className="mb-5 max-w-3xl text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{catalog.note}</p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {catalog.entries.map((s) => (
          <div key={s.id} className="gal-card flex flex-col" title={s.id}>
            <div
              className="dot-grid flex items-center justify-center p-2"
              style={{ height: 76, background: '#ffffff' }}
            >
              <div
                className="flex h-full w-full items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:w-auto"
                dangerouslySetInnerHTML={{ __html: s.svg }}
              />
            </div>
            <div
              className="truncate px-2 py-1.5 text-center text-[10.5px]"
              style={{ borderTop: '1px solid var(--line)', color: 'var(--text-muted)' }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
