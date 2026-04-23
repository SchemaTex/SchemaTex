# User-Facing Syntax Docs — Standard

*How we write every `website/content/docs/{diagram}.mdx` page. Principles first, prescriptions last.*

> **Owner:** Victor · **Status:** Active standard
> **Audience:** humans learning the DSL, and LLMs generating it on their behalf.
> **This is the doc you write to.** `docs/reference/*` is internal engineering spec — not a substitute, not an overflow.

---

## 1. What these docs are for

Two readers, same page, same words.

**The human reader** has a real diagram to draw — a family in therapy intake, a single-line for a 13 kV substation, an org chart before a board meeting. They arrived because they Googled a problem. They will leave the moment they can copy a working snippet or decide the library isn't the right fit. They do not want an academic treatment of the standard; they want to draw the thing.

**The LLM reader** has a user's natural-language request and is trying to emit valid Schematex DSL in one shot. It has never seen this diagram's syntax before the request arrived. It cannot ask follow-up questions. If a feature is documented but the parser rejects it, the LLM will emit broken DSL and the user will blame the library, not the model.

The docs are good when both readers succeed from the same page with no external context. They fail when either has to cross-reference `src/diagrams/*/parser.ts` to figure out what actually works.

This is why the docs are not a spec and not a tutorial — they are **an operator's manual**: what the parser accepts, organized so the common case is obvious and the long tail is findable.

## 2. Principles

**Accuracy over completeness.** A documented feature that doesn't parse is worse than an undocumented feature that does. Aspirational syntax, future plans, and half-implemented ideas belong in a clearly-labeled roadmap section or nowhere. This is the only principle with no exceptions.

**Show, then name.** A runnable snippet before a formal rule. Readers generalize from examples faster than they parse grammar. Every page opens with a representative `<Playground>`, and every major concept gets a second one that isolates that concept.

**Tables for anything enumerable.** Operators, shapes, attribute values, error messages — if the set is closed and finite, one table beats a list of `###` subsections. Tables are denser for humans and tokenize cleanly for LLMs.

**Parallel structure across diagrams.** A reader (or LLM) who has learned one page should know where to look on the next. The same *kinds* of information appear in the same *kinds* of places. This does not mean identical outlines — a mindmap has no couples, a timing diagram has no children — but the answers to "what connects to what?" live in comparable positions.

**Progressive disclosure.** Hello world first, advanced last, roadmap last of all. Never open with EBNF. Readers who need grammar know to scroll for it.

**Writer's voice: operator's manual.** Imperative, concrete, plain. "Use `--` for marriage" beats "Marriage is represented by the `--` operator." No marketing. No "you must" / "you should" — describe what the parser does and let the reader decide.

**No programmer idioms in section headings.** Our readers include clinicians, engineers, lawyers, and genetic counselors — not all of them write code. Section titles should name the *diagram concept*, not the software convention. Prefer "Your first genogram" over "Hello world", "A minimal circuit" over "Getting started", "The building blocks" over "Primitives". The same goes for examples and prose: no "foo/bar", no "TODO", no "FIXME" in user-visible content.

## 3. What every page answers

A good page answers these questions in roughly this order. Skip any that don't apply. Combine adjacent ones when it reads better. The order is a default, not a rule.

1. *"What is this diagram and who is it for?"* — a short **About {diagram}** section first, then a single representative Playground. Words before the demo: the reader should know what they're looking at when the SVG renders. The About section orients someone who has never heard the term — what the diagram represents, which professionals use it for what, which published standard Schematex follows — plus 1–3 authoritative external links (the standard's book, a Wikipedia entry, a field-society page) so the page feels grounded. Keep it to ~2 short paragraphs, an orientation not a literature review. One Playground in this opening zone is enough; a minimal teaching example belongs in §1 "Your first {diagram}", not duplicated at the top. Do NOT also put a prose description in the MDX frontmatter — fumadocs renders it as a lead under the H1 and it duplicates the About section. Frontmatter `title` alone is enough.
2. *"What is the smallest thing I can write?"* — an annotated 3-line snippet.
3. *"What are the building blocks?"* — the primitive (person, node, actor) and its attributes.
4. *"What shapes / variants exist?"* — if the diagram has them; a single table.
5. *"How do I connect things?"* — the operator table + a runnable example.
6. *"How do I nest / group / indent?"* — if structural nesting is part of the DSL.
7. *"How do I label, comment, and configure?"* — quoting rules, comments, `%%` directives.
8. *"What will trip me up?"* — reserved words, escaping, the common parse errors.
9. *"What's the formal grammar?"* — EBNF, lifted from the parser's header comment. For readers who need precision.
10. *"Where does this come from, and where do I go deeper?"* — standard citations, links to related examples, roadmap if relevant.

A diagram that doesn't have connections (a treemap, a timeline) skips Q5 entirely. A diagram whose grammar is trivial (mindmap) can fold Q9 into prose. The goal is that a reader finishes the page able to write valid DSL for their actual task — not that every section appears.

## 4. Hard rules

There are only three.

**Every documented feature parses in the current release.** If the parser rejects it, it doesn't go in the main body. Verify by running the snippet. Roadmap section (clearly labeled as unavailable) is the only legitimate home for not-yet-parseable syntax.

**Every example is self-contained and runnable.** Use `<Playground>` liberally; a snippet that references IDs from a previous example is broken by design because readers copy in isolation.

**User docs don't leak implementation.** No `<clipPath>`, no CSS class names, no coordinate math, no SVG tagging. Those live in `docs/reference/`. A user who needs them can go read the reference; a user who doesn't shouldn't have to skim past them.

Everything else — section count, table column order, line budget, Playground frequency — is judgment. Good taste beats the checklist.

## 5. Judgment calls

**Depth scales with the diagram's surface area.** A mindmap doc at ~150 lines and a genogram doc at ~300 lines are both correct; a 500-line mindmap doc means you leaked reference material, and a 100-line genogram doc means you skipped the emotional-relationship table.

**Use a roadmap section only when the drift matters.** If `src/core/types.ts` defines five attributes the parser doesn't yet accept and users keep trying them (based on issues, examples, or prior drift), document the gap. If no one has tried the feature, silence is fine — don't create promises.

**Reference docs are a pointer, not a hierarchy.** Don't structure user docs as "simplified reference docs" — they're a different genre with a different audience. Citations at the end, not cross-references throughout.

**When in doubt, delete.** The failure mode we're rewriting away from is pages that document everything the type system supports plus everything the renderer could theoretically do. Err on the side of "not in the main body."

## 6. Playgrounds

We have an interactive runner (`website/components/Playground.tsx`) and should use it the way Mermaid uses its "Run ▶" button: as the default way to show a feature, not a special treat. If a section introduces a concept, it gets a Playground. A page that is all prose and one hero Playground is under-using the medium.

Snippets inside Playgrounds are isolated worlds — they include the diagram keyword, declare everything they reference, and are copy-pasteable as-is.

## 7. Where things live

| File | Role |
|---|---|
| `website/content/docs/{diagram}.mdx` | This standard applies. User-facing, English, operator's manual. |
| `docs/reference/{NN}-{NAME}-STANDARD.md` | Engineering spec. Implementation details, standard compliance, design decisions. Not a substitute for user docs. |
| `src/diagrams/{name}/parser.ts` | Truth for what syntax is accepted. The docs follow the parser, not the other way around. |
| `src/core/types.ts` | Truth for what the AST supports. A feature here but not in the parser is a roadmap candidate, not a main-body claim. |
| `website/content/examples/{diagram}-*.mdx` | Runnable scenarios. User docs link to them, don't duplicate them. |

## 8. Adoption

Rewrite existing docs one at a time, in order of impact, with soak time between. Each rewrite is its own PR. Start with diagrams where drift hurts most (flagship, most-used, worst inconsistency) and let practice refine the standard before applying it at scale. If this doc gets in your way while writing, change this doc — the standard is a tool, not a cage.
