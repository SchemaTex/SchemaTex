# Schematex website

Landing + docs + examples site for [Schematex](https://github.com/victorzhrn/Schematex).

Built with **Next.js 15** + **Fumadocs** + **Tailwind v4**. Deployed to
Vercel at [schematex.dev](https://schematex.dev).

## Develop

```bash
# From repo root — build the library first so the site can import it
npm run build

# Then in this dir
cd website
npm install
npm run dev
```

Visit http://localhost:3000.

## Structure

```
app/
  (home)/page.tsx          ← Landing
  (home)/playground/       ← Standalone playground
  docs/[[...slug]]/        ← Per-diagram syntax docs (fumadocs)
  examples/[[...slug]]/    ← Real-world case study pages (SEO)
  sitemap.ts / robots.ts   ← SEO
components/
  Playground.tsx           ← Live DSL → SVG editor
  DiagramCard.tsx          ← Gallery tile
content/
  docs/*.mdx               ← 13 syntax pages
  examples/*.mdx           ← Case studies (grows over time)
lib/
  gallery-data.ts          ← Landing gallery DSL snippets
  source.ts                ← Fumadocs content sources
  layout.shared.tsx        ← Shared nav
```

## Adding content

- **New syntax reference** → `content/docs/<slug>.mdx` and register in
  `content/docs/meta.json`
- **New example** → `content/examples/<slug>.mdx` and register in
  `content/examples/meta.json`. Every example becomes its own SEO-indexed
  page with OG metadata.

## i18n (future)

Structure is single-locale (`en`) for now. When adding translations:

1. Move `app/(home)`, `app/docs`, `app/examples` under `app/[lang]/`
2. Add `middleware.ts` for locale detection
3. Duplicate `content/docs/*.mdx` → `content/docs.zh/*.mdx`, etc.
4. Use Fumadocs built-in `i18n` config in `source.config.ts`

No code needs to change today — just keep all user-facing strings in MDX
so translation is a file-copy operation.

## Deploy

Vercel picks up automatically. Set project root to `website/` if needed.

- `NEXT_PUBLIC_SITE_URL=https://schematex.dev`
- Domain: point `schematex.dev` at the Vercel project.
