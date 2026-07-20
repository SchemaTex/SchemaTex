# @schematex/mcp

MCP (Model Context Protocol) server for [Schematex](https://schematex.js.org) — gives AI agents eight tools to discover, generate, validate, render, inspect, and safely edit diagrams.

## Two ways to use it

### 1. Hosted (recommended) — zero install

Claude Desktop, ChatGPT, Cursor, Windsurf, and any MCP client that speaks Streamable HTTP can connect to the hosted endpoint:

```
https://schematex.js.org/mcp
```

No setup, no local process, auto-updates with the schematex package.

### 2. Local stdio — for offline / custom hosts

```bash
npx @schematex/mcp
```

Example Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "schematex": {
      "command": "npx",
      "args": ["-y", "@schematex/mcp"]
    }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `listDiagrams` | List every diagram type with tagline / use-when / standard |
| `getSyntax` | Canonical generation syntax by default; request `detail: reference` for the fuller grammar/tutorial |
| `getExamples` | Curated real-world DSL examples with scenario notes |
| `validateDsl` | Parse-only check; returns structured errors with line numbers |
| `renderDsl` | Render DSL → SVG; failed renders return errors plus a visible diagnostic SVG |
| `getDiagramCapabilities` | Return safe text / position editing modes for one diagram type |
| `inspectDiagram` | Return a revision and stable editable targets without exposing source offsets |
| `applyDiagramEdits` | Atomically apply revision-guarded label or position edits |

## Recommended agent prompt

> You write and edit Schematex DSL. For generation, call `listDiagrams`, `getSyntax`, `getExamples`, then `validateDsl` and self-correct. For edits, call `inspectDiagram`, use only returned target keys and allowed operations, and pass its exact revision to `applyDiagramEdits`.

## License

AGPL-3.0-only. See the root [Schematex repo](https://github.com/SchemaTex/SchemaTex) for commercial licensing.
