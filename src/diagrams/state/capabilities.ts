export interface StateGenerationCapabilities {
  directions: readonly ["LR", "TB", "auto"];
  multilineLabels: readonly ["escaped-newline", "physical-newline"];
  autoLongChainThreshold: 4;
  extremeAspectRatioDiagnostic: "STATE_EXTREME_ASPECT_RATIO";
  manualLayoutAttribute: "data-manual-layout";
}

/** Public direction/text/provenance contract used by generation profiles. */
export const STATE_GENERATION_CAPABILITIES: StateGenerationCapabilities =
  Object.freeze({
    directions: Object.freeze(["LR", "TB", "auto"] as const),
    multilineLabels: Object.freeze(
      ["escaped-newline", "physical-newline"] as const
    ),
    autoLongChainThreshold: 4,
    extremeAspectRatioDiagnostic: "STATE_EXTREME_ASPECT_RATIO",
    manualLayoutAttribute: "data-manual-layout",
  });

export function getStateGenerationCapabilities(): StateGenerationCapabilities {
  return STATE_GENERATION_CAPABILITIES;
}
