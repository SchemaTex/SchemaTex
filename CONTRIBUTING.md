# Contributing to Schematex

Schematex is currently maintained by **Victor** ([@victorzhrn](https://github.com/victorzhrn)) with **Claude** (Anthropic) as the primary development collaborator.

---

## How this project is built

Most of Schematex is written in a tight loop between Victor and Claude Code. Victor owns product direction, standards research, and final review. Claude handles implementation, test scaffolding, and refactoring — with Victor reviewing every diff before it lands.

If you open a PR, expect the same review bar: correctness against the referenced standard, zero added runtime dependencies, strict TypeScript, and tests for any layout logic.

---

## Before you open an issue

- Check `docs/reference/` for the relevant standard doc. If your bug contradicts the standard, cite the standard.
- Check `docs/issues/` for known problems already being tracked.
- If the diagram renders incorrectly, include: the DSL input, what you expected, and what you got (paste the SVG or a screenshot).

## Before you open a PR

1. **Discuss first for anything non-trivial.** Open an issue describing what you want to change and why. This avoids duplicate work — Victor or Claude may already have it in progress.
2. **No new runtime dependencies.** Zero is a hard constraint, not a preference.
3. **Test-first for layout.** If you touch any coordinate math, write the test before the code.
4. **Follow the existing pipeline.** `Text → Parser → AST → Layout → LayoutResult → Renderer → SVG`. Don't shortcut it.
5. **Use `src/core/svg.ts` builder.** No raw SVG string concatenation.
6. **Run the full gate before pushing:**
   ```bash
   npm run typecheck
   npm test
   npm run lint
   npm run build
   ```

## Scope of contributions welcomed

| Welcome | Not in scope |
|---|---|
| Bug fixes with a clear standard citation | New diagram types without prior discussion |
| Test coverage for existing diagrams | Runtime dependencies of any kind |
| DSL ergonomics improvements | Breaking changes to the render API |
| Accessibility improvements (ARIA, `<title>`, `<desc>`) | Opinionated style overhauls |

## License

By contributing you agree your changes will be licensed under [AGPL-3.0](./LICENSE). If you need a commercial license for your use case, contact victor@mymap.ai.
