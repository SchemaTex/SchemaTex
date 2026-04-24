# @schematex/mcp

MCP (Model Context Protocol) server for [Schematex](https://schematex.js.org) — gives AI agents tools to discover diagram types, read syntax references, fetch curated examples, validate DSL, and render SVG diagrams.

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
| `getSyntax` | Compact syntax reference (grammar + rules + inline examples) for one diagram type, ~2–4k tokens |
| `getExamples` | Curated real-world DSL examples with scenario notes |
| `validateDsl` | Parse-only check; returns structured errors with line numbers |
| `renderDsl` | Render DSL → SVG |

## Recommended agent prompt

> You write Schematex DSL. First call `listDiagrams` to pick a type. Then call `getSyntax` and `getExamples` for that type. Write the DSL, then call `validateDsl` and self-correct on any errors before returning the final DSL to the user.

## License

AGPL-3.0-only. See the root [Schematex repo](https://github.com/victorzhrn/Schematex) for commercial licensing.
