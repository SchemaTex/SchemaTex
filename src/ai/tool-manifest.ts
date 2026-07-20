export interface SchematexToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Model-visible tool contracts shared by AI SDK, stdio MCP, and hosted MCP. */
export const SCHEMATEX_TOOL_DEFINITIONS = {
  listDiagrams: {
    name: "listDiagrams",
    title: "List Schematex diagrams",
    description: "List every Schematex diagram type with selection guidance, standards, aliases, and canvas-editing capabilities. Call this first when the best diagram type is not already known.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  getSyntax: {
    name: "getSyntax",
    title: "Get diagram syntax",
    description: "Return syntax for one diagram type. The default canonical detail is the compact generation path; request reference detail only for advanced forms or imported adapters.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Diagram type id from listDiagrams." },
        detail: { type: "string", enum: ["canonical", "reference"], description: "Defaults to canonical." },
      },
      required: ["type"],
      additionalProperties: false,
    },
  },
  getExamples: {
    name: "getExamples",
    title: "Get curated examples",
    description: "Return curated real-world DSL examples for one diagram type. Use a small result as few-shot context before generating DSL.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 10 },
        preferFeatured: { type: "boolean" },
        maxComplexity: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["type"],
      additionalProperties: false,
    },
  },
  validateDsl: {
    name: "validateDsl",
    title: "Validate Schematex DSL",
    description: "Validate DSL and return structured line, column, message, and repair hints. Call before returning generated DSL and self-correct invalid output.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string" }, dsl: { type: "string" } },
      required: ["dsl"],
      additionalProperties: false,
    },
  },
  renderDsl: {
    name: "renderDsl",
    title: "Render DSL to SVG",
    description: "Render Schematex DSL to an SVG artifact. Use when the client needs the final diagram output; apps that render Schematex locally should return validated DSL instead.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        dsl: { type: "string" },
        theme: { type: "string" },
        padding: { type: "number" },
      },
      required: ["dsl"],
      additionalProperties: false,
    },
  },
  getDiagramCapabilities: {
    name: "getDiagramCapabilities",
    title: "Get diagram editing capabilities",
    description: "Return the safe canvas text and position-editing model for one diagram type. Use before proposing direct manipulation or geometry changes.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string" } },
      required: ["type"],
      additionalProperties: false,
    },
  },
  inspectDiagram: {
    name: "inspectDiagram",
    title: "Inspect editable diagram items",
    description: "Parse existing DSL and return stable editable targets, visible labels, bounds, and allowed edit modes. Source offsets are intentionally hidden from the model.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string" }, dsl: { type: "string" } },
      required: ["dsl"],
      additionalProperties: false,
    },
  },
  applyDiagramEdits: {
    name: "applyDiagramEdits",
    title: "Apply atomic diagram edits",
    description: "Apply a batch of label or position edits to an inspected diagram revision. Returns updated DSL only when every edit succeeds and the result still renders.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        dsl: { type: "string" },
        revision: { type: "integer", minimum: 0, description: "Revision returned by inspectDiagram." },
        edits: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: {
            type: "object",
            properties: {
              target: { type: "string", description: "Scene target key returned by inspectDiagram." },
              op: { type: "string", enum: ["setLabel", "setPosition"] },
              value: { type: "string", description: "Required for setLabel." },
              x: { type: "number", description: "Required for setPosition; SVG bbox top-left x." },
              y: { type: "number", description: "Required for setPosition; SVG bbox top-left y." },
            },
            required: ["target", "op"],
            additionalProperties: false,
          },
        },
      },
      required: ["dsl", "revision", "edits"],
      additionalProperties: false,
    },
  },
} as const satisfies Record<string, SchematexToolDefinition>;

export type SchematexToolName = keyof typeof SCHEMATEX_TOOL_DEFINITIONS;
