import type { LogicGateType } from "../../core/types";

// Normalized gate geometry: combinational gates fit in 100×60; sequential in 60×80.
export interface GateGeometry {
  width: number;
  height: number;
  inputPins: Array<{ id: string; x: number; y: number; label?: string }>;
  outputPins: Array<{ id: string; x: number; y: number; label?: string; bubble?: boolean }>;
  /** Body SVG path (ANSI) */
  ansiPath: string;
  /** Layout expands crowded pin rows; bake this factor into artwork coordinates. */
  bodyScaleY?: number;
  /** Output bubble? */
  outputBubble?: boolean;
  /** Clock triangle pin id (sequential) */
  clockPin?: string;
  /** IEC label inside rectangle */
  iecLabel?: string;
}

/** Output bubble radius; the output pin sits one diameter past the gate nose. */
export const OUTPUT_BUBBLE_R = 4;

/** X where an input wire meets a curved OR-family back (XOR's separate arc sits further left); null for straight backs. */
export function curvedBackX(gateType: string, pinY: number, height: number, hasXorArc: boolean): number | null {
  if (gateType !== "OR" && gateType !== "NOR" && !hasXorArc) return null;
  const t = pinY / height;
  return (hasXorArc ? 6 : 12) + 32 * t * (1 - t);
}

/** Artwork only: dimensions and connection anchors remain owned by getGateGeometry. */
export function getGatePaths(
  gateType: string,
  width: number,
  height: number,
  scaleY = 1
): { body: string; xorArc?: string; xorGap?: string } {
  const y = (value: number): number => value * scaleY;
  switch (gateType) {
    case "AND":
    case "NAND": {
      const nose = width - (gateType === "NAND" ? 8 : 0);
      const shoulder = nose - 30;
      return { body: `M 20,0 H ${shoulder} A 30 ${y(30)} 0 0 1 ${shoulder},${y(60)} H 20 Z` };
    }
    case "OR":
    case "NOR":
    case "XOR":
    case "XNOR": {
      const nose = width - (gateType === "NOR" || gateType === "XNOR" ? 8 : 0);
      const span = nose - 12;
      const c1 = 12 + span * 26 / 60;
      const c2 = 12 + span * 46 / 60;
      const body = `M 12,0 Q 28,${y(30)} 12,${y(60)} C ${c1},${y(57.5)} ${c2},${y(47.5)} ${nose},${y(30)} C ${c2},${y(12.5)} ${c1},${y(2.5)} 12,0 Z`;
      if (gateType === "XOR" || gateType === "XNOR") {
        return {
          body,
          xorArc: `M 6,0 Q 22,${y(30)} 6,${y(60)}`,
          // Mask routed wire ends that lie beyond the outer curve. The extra
          // arc itself stays open and unfilled, including on dark themes.
          xorGap: `M 6,0 Q 22,${y(30)} 6,${y(60)} L 12,${y(60)} Q 28,${y(30)} 12,0 Z`,
        };
      }
      return { body };
    }
    case "NOT":
    case "BUF":
    case "SCHMITT":
    case "TRISTATE_BUF":
    case "TRISTATE_INV":
    case "OPEN_DRAIN": {
      const nose = width - (gateType === "NOT" || gateType === "TRISTATE_INV" ? 8 : 0);
      return { body: `M 10,${y(55)} L ${nose},${y(30)} L 10,${y(5)} Z` };
    }
    default:
      return { body: `M 0,0 H ${width} V ${height} H 0 Z` };
  }
}

function combPins(nInputs: number, _width: number, leftX: number): Array<{ id: string; x: number; y: number }> {
  const pins: Array<{ id: string; x: number; y: number }> = [];
  if (nInputs === 1) {
    pins.push({ id: "in1", x: leftX, y: 30 });
  } else if (nInputs === 2) {
    pins.push({ id: "in1", x: leftX, y: 15 });
    pins.push({ id: "in2", x: leftX, y: 45 });
  } else {
    const step = 50 / (nInputs - 1);
    for (let i = 0; i < nInputs; i++) {
      pins.push({ id: `in${i + 1}`, x: leftX, y: 5 + step * i });
    }
  }
  return pins;
}

export function getGateGeometry(
  gateType: LogicGateType,
  inputCount: number
): GateGeometry {
  switch (gateType) {
    case "AND":
    case "NAND": {
      const bubble = gateType === "NAND";
      return {
        width: bubble ? 90 : 80,
        height: 60,
        inputPins: combPins(inputCount, 80, 20).map((p) => ({ ...p, x: 20 })),
        outputPins: [{ id: "out", x: bubble ? 90 : 80, y: 30, bubble }],
        ansiPath: getGatePaths(gateType, bubble ? 90 : 80, 60).body,
        outputBubble: bubble,
        iecLabel: "&",
      };
    }
    case "OR":
    case "NOR": {
      const bubble = gateType === "NOR";
      return {
        width: bubble ? 80 : 70,
        height: 60,
        inputPins: combPins(inputCount, 80, 18).map((p) => ({ ...p, x: 18 })),
        outputPins: [{ id: "out", x: bubble ? 80 : 70, y: 30, bubble }],
        ansiPath: getGatePaths(gateType, bubble ? 80 : 70, 60).body,
        outputBubble: bubble,
        iecLabel: "≥1",
      };
    }
    case "XOR":
    case "XNOR": {
      const bubble = gateType === "XNOR";
      return {
        width: bubble ? 80 : 70,
        height: 60,
        inputPins: combPins(inputCount, 80, 12).map((p) => ({ ...p, x: 12 })),
        outputPins: [{ id: "out", x: bubble ? 80 : 70, y: 30, bubble }],
        ansiPath: getGatePaths(gateType, bubble ? 80 : 70, 60).body,
        outputBubble: bubble,
        iecLabel: "=1",
      };
    }
    case "NOT": {
      return {
        width: 70,
        height: 60,
        inputPins: [{ id: "in1", x: 10, y: 30 }],
        outputPins: [{ id: "out", x: 70, y: 30, bubble: true }],
        ansiPath: getGatePaths(gateType, 70, 60).body,
        outputBubble: true,
        iecLabel: "1",
      };
    }
    case "BUF":
    case "SCHMITT": {
      return {
        width: 60,
        height: 60,
        inputPins: [{ id: "in1", x: 10, y: 30 }],
        outputPins: [{ id: "out", x: 60, y: 30 }],
        ansiPath: "M 10,55 L 60,30 L 10,5 Z",
        iecLabel: "1",
      };
    }
    case "TRISTATE_BUF":
    case "TRISTATE_INV":
    case "OPEN_DRAIN": {
      const bubble = gateType === "TRISTATE_INV";
      return {
        width: bubble ? 70 : 60,
        height: 70,
        inputPins: [
          { id: "in1", x: 10, y: 30 },
          { id: "en", x: 35, y: 65, label: "EN" },
        ],
        outputPins: [{ id: "out", x: bubble ? 70 : 60, y: 30, bubble }],
        ansiPath: getGatePaths(gateType, bubble ? 70 : 60, 70).body,
        outputBubble: bubble,
        iecLabel: "1",
      };
    }
    case "DFF": {
      return {
        width: 60,
        height: 80,
        inputPins: [
          { id: "D", x: 0, y: 20, label: "D" },
          { id: "CLK", x: 0, y: 50, label: "" },
        ],
        outputPins: [
          { id: "Q", x: 60, y: 20, label: "Q" },
          { id: "Qn", x: 60, y: 60, label: "Q̄", bubble: true },
        ],
        ansiPath: "M 0,0 H 60 V 80 H 0 Z",
        clockPin: "CLK",
        iecLabel: "DFF",
      };
    }
    case "JKFF": {
      return {
        width: 60,
        height: 80,
        inputPins: [
          { id: "J", x: 0, y: 15, label: "J" },
          { id: "CLK", x: 0, y: 40 },
          { id: "K", x: 0, y: 65, label: "K" },
        ],
        outputPins: [
          { id: "Q", x: 60, y: 20, label: "Q" },
          { id: "Qn", x: 60, y: 60, label: "Q̄", bubble: true },
        ],
        ansiPath: "M 0,0 H 60 V 80 H 0 Z",
        clockPin: "CLK",
        iecLabel: "JK",
      };
    }
    case "SRFF":
    case "LATCH_SR": {
      return {
        width: 60,
        height: 80,
        inputPins: [
          { id: "S", x: 0, y: 20, label: "S" },
          { id: "R", x: 0, y: 60, label: "R" },
        ],
        outputPins: [
          { id: "Q", x: 60, y: 20, label: "Q" },
          { id: "Qn", x: 60, y: 60, label: "Q̄", bubble: true },
        ],
        ansiPath: "M 0,0 H 60 V 80 H 0 Z",
        iecLabel: "SR",
      };
    }
    case "TFF": {
      return {
        width: 60,
        height: 80,
        inputPins: [
          { id: "T", x: 0, y: 20, label: "T" },
          { id: "CLK", x: 0, y: 50 },
        ],
        outputPins: [
          { id: "Q", x: 60, y: 20, label: "Q" },
          { id: "Qn", x: 60, y: 60, label: "Q̄", bubble: true },
        ],
        ansiPath: "M 0,0 H 60 V 80 H 0 Z",
        clockPin: "CLK",
        iecLabel: "T",
      };
    }
    case "LATCH_D": {
      return {
        width: 60,
        height: 80,
        inputPins: [
          { id: "D", x: 0, y: 20, label: "D" },
          { id: "E", x: 0, y: 60, label: "E" },
        ],
        outputPins: [
          { id: "Q", x: 60, y: 20, label: "Q" },
          { id: "Qn", x: 60, y: 60, label: "Q̄", bubble: true },
        ],
        ansiPath: "M 0,0 H 60 V 80 H 0 Z",
        iecLabel: "D",
      };
    }
    case "unknown": {
      // Visibly-flagged placeholder for an unrecognised gate token. A box with
      // a "?" label — never a real gate shape, so it can't be mistaken for one.
      const ins = Math.max(inputCount, 1);
      const inputPins = combPins(ins, 90, 0).map((p) => ({ ...p, x: 0 }));
      return {
        width: 90,
        height: 70,
        inputPins,
        outputPins: [{ id: "out", x: 90, y: 35 }],
        ansiPath: "M 0,0 H 90 V 70 H 0 Z",
        iecLabel: "?",
      };
    }
    default: {
      // Generic box for MUX/DEMUX/DECODER/ENCODER/COUNTER/SHIFT_REG
      const ins = Math.max(inputCount, 2);
      const inputPins = combPins(ins, 100, 0).map((p, i) => ({
        ...p,
        x: 0,
        label: `I${i}`,
      }));
      return {
        width: 100,
        height: 80,
        inputPins,
        outputPins: [{ id: "out", x: 100, y: 40 }],
        ansiPath: "M 0,0 H 100 V 80 H 0 Z",
        iecLabel: gateType,
      };
    }
  }
}
