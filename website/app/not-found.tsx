import Link from 'next/link';
import { render } from 'schematex';
import { CountdownRedirect } from '@/components/CountdownRedirect';

export const metadata = {
  title: '404 — lost node',
  description: 'This page is not on the graph.',
  robots: { index: false, follow: true },
};

// The 404 page is itself a Schematex diagram — every page is a diagram, even
// the one that doesn't exist. Rendered server-side, so it ships as static SVG.
const DSL = `flowchart LR
  here([You are here]) --> q{Page exists?}
  q -->|No| lost[404 · lost node]
  lost --> home([Take me home])`;

function renderBanner(): string {
  const svg = render(DSL);
  // Strip the fixed width/height from the root tag so the viewBox lets it
  // scale fluidly to its container.
  return svg.replace(/^<svg([^>]*?)>/, (_m, attrs) =>
    `<svg${attrs.replace(/\s(?:width|height)="[\d.]+"/g, '')}>`,
  );
}

export default function NotFound() {
  const banner = renderBanner();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-fd-primary">
        404
      </p>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl">
        This node isn’t on the graph
      </h1>
      <p className="mt-3 max-w-xl text-pretty text-lg leading-relaxed text-fd-muted-foreground">
        The page you’re looking for doesn’t exist — maybe the link was wrong, or
        it moved. Here’s the path back:
      </p>

      <div
        className="mt-10 w-full max-w-2xl [&_svg]:h-auto [&_svg]:w-full"
        // Decorative diagram of the 404 → home path.
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: banner }}
      />
      <p className="mt-3 text-xs text-fd-muted-foreground/80">
        Every page on Schematex is a diagram — even this one.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md bg-fd-foreground px-4 py-2 text-sm font-medium text-fd-background hover:opacity-90"
        >
          ← Back home
        </Link>
        <Link
          href="/examples"
          className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-4 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-accent"
        >
          Browse examples
        </Link>
        <Link
          href="/playground"
          className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-4 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-accent"
        >
          Open playground
        </Link>
      </div>

      <div className="mt-8">
        <CountdownRedirect seconds={12} to="/" />
      </div>
    </main>
  );
}
