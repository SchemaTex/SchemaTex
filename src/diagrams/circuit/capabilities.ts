import type { CircuitComponentType } from "../../core/types";
import { getSymbol, listCircuitSymbolTypes } from "./symbols";

export interface CircuitGenerationCapabilities {
  preferredMode: "netlist";
  supportedComponentTypes: readonly CircuitComponentType[];
  automotiveTypes: readonly [
    "automotive_flasher_3pin",
    "switch_spdt_center_off",
  ];
  optionalPins: Readonly<Record<string, readonly string[]>>;
}

/**
 * Machine-readable generation contract for Circuit.
 *
 * The complete component inventory is derived from the live symbol registry,
 * so parser acceptance, renderer support, and generation discovery cannot
 * silently drift into three different lists.
 */
export const CIRCUIT_GENERATION_CAPABILITIES: CircuitGenerationCapabilities =
  Object.freeze({
    preferredMode: "netlist",
    supportedComponentTypes: Object.freeze(listCircuitSymbolTypes()),
    automotiveTypes: Object.freeze(
      [
        "automotive_flasher_3pin",
        "switch_spdt_center_off",
      ] as const
    ),
    optionalPins: Object.freeze({
      automotive_flasher_3pin: Object.freeze(
        getSymbol("automotive_flasher_3pin")?.optionalNetlistPins ?? []
      ),
    }),
  });

export function getCircuitGenerationCapabilities(): CircuitGenerationCapabilities {
  return CIRCUIT_GENERATION_CAPABILITIES;
}
