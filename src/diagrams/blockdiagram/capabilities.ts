export interface BlockDiagramGenerationCapabilities {
  header: "blockdiagram";
  multilineLabels: readonly ["escaped-newline", "physical-newline"];
  unknownStatementPolicy: "error";
  undeclaredEndpointPolicy: "error";
  explicitShorthand: "[ID]";
  layout: "measured-layered";
}

/** Public parser/layout contract used by generation profiles and tests. */
export const BLOCKDIAGRAM_GENERATION_CAPABILITIES: BlockDiagramGenerationCapabilities =
  Object.freeze({
    header: "blockdiagram",
    multilineLabels: Object.freeze(
      ["escaped-newline", "physical-newline"] as const
    ),
    unknownStatementPolicy: "error",
    undeclaredEndpointPolicy: "error",
    explicitShorthand: "[ID]",
    layout: "measured-layered",
  });

export function getBlockDiagramGenerationCapabilities(): BlockDiagramGenerationCapabilities {
  return BLOCKDIAGRAM_GENERATION_CAPABILITIES;
}
