import type { SchematexDiagnostic } from "../../core/diagnostics";

export type FloorplanCapability =
  | "rectilinear-boundaries"
  | "multi-floor"
  | "furniture-layout"
  | "wall-fixtures"
  | "protected-zones"
  | "curved-boundaries"
  | "plumbing-runs"
  | "electrical-circuits"
  | "hvac-runs"
  | "auto-space-planning";

export interface FloorplanCapabilityEntry {
  supported: boolean;
  description: string;
  alternative?: string;
}

export const FLOORPLAN_CAPABILITIES: Readonly<Record<FloorplanCapability, FloorplanCapabilityEntry>> = {
  "rectilinear-boundaries": {
    supported: true,
    description: "Rectangles and rectilinear unions created with room + extend.",
  },
  "multi-floor": {
    supported: true,
    description: "Explicit floor sections packed at one shared drawing scale.",
  },
  "furniture-layout": {
    supported: true,
    description: "Measured furniture, center arrays, bounded arrays, and collision validation.",
  },
  "wall-fixtures": {
    supported: true,
    description: "Fixtures anchored to a named room wall and percentage.",
  },
  "protected-zones": {
    supported: true,
    description: "Measured keep-clear regions that reject furniture obstruction.",
  },
  "curved-boundaries": {
    supported: false,
    description: "Arc and spline room boundaries are not represented by the rectilinear geometry model.",
    alternative: "Use siteplan for an exterior polygon, or simplify the room only with the user's approval.",
  },
  "plumbing-runs": {
    supported: false,
    description: "Floorplan places plumbing fixtures but does not route pipes.",
    alternative: "Use a dedicated plumbing/P&ID workflow; do not substitute furniture points for pipe runs.",
  },
  "electrical-circuits": {
    supported: false,
    description: "Floorplan places electrical devices but does not represent wiring or circuit connectivity.",
    alternative: "Use circuit or SLD for connectivity and floorplan only for device locations.",
  },
  "hvac-runs": {
    supported: false,
    description: "Duct routing and sized HVAC networks are outside the floorplan geometry model.",
    alternative: "Use floorplan only for room and equipment locations.",
  },
  "auto-space-planning": {
    supported: false,
    description: "The engine validates authored geometry; it does not invent a code-compliant space program.",
    alternative: "Provide explicit room dimensions and adjacency, then validate the result.",
  },
};

export function getFloorplanCapabilities(): typeof FLOORPLAN_CAPABILITIES {
  return FLOORPLAN_CAPABILITIES;
}

export function isFloorplanCapability(
  value: unknown
): value is FloorplanCapability {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FLOORPLAN_CAPABILITIES, value)
  );
}

export function validateFloorplanIntent(
  requested: readonly FloorplanCapability[]
): SchematexDiagnostic[] {
  return requested.flatMap((capability) => {
    if (!isFloorplanCapability(capability)) {
      return [{
        severity: "error" as const,
        code: "floorplan/unknown-capability",
        message: `Unknown floorplan capability: ${String(capability)}`,
        hint: `Use one of: ${Object.keys(FLOORPLAN_CAPABILITIES).join(", ")}.`,
        fatal: true,
      }];
    }
    const entry = FLOORPLAN_CAPABILITIES[capability];
    if (entry.supported) return [];
    return [{
      severity: "error" as const,
      code: `floorplan/unsupported-${capability}`,
      message: `Floorplan cannot represent ${capability}: ${entry.description}`,
      hint: entry.alternative,
      fatal: true,
    }];
  });
}
