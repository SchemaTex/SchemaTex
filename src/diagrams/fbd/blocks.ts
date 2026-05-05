/**
 * FBD standard-block port specs.
 *
 * Each std block declares its input/output port names, types, and rendering hints
 * (header label, inner symbol). Used by the parser to validate calls and infer
 * port wiring, and by the renderer to draw the right inner glyph.
 *
 * IEC 61131-3 §2.5.1 / §6.4 reference.
 */

import type { FbdDataType, FbdStdBlockName, FbdPortSide } from "../../core/types";

export interface PortSpec {
  name: string;
  side: FbdPortSide;
  dataType: FbdDataType;
  /** True if this port is variadic (accepts INn for n=1..N). Boolean ANDs, ORs, ADDs etc. */
  variadic?: boolean;
}

export interface BlockSpec {
  name: FbdStdBlockName;
  /** Header text rendered at top of block. Defaults to name. */
  header?: string;
  /** Inner symbol drawn inside (IEC distinctive — `&`, `≥1`, `1`, `=1`). */
  innerSymbol?: string;
  /** Output port has a negation bubble in IEC convention (NAND/NOR/NOT/XNOR). */
  outputNegated?: boolean;
  ports: PortSpec[];
  /** Default number of inputs for variadic boolean blocks (AND/OR/NAND/NOR). */
  defaultInputs?: number;
  /** Primary output port (used when LHS = ... wires to a variable). */
  primaryOut?: string;
}

export const BLOCK_SPECS: Record<FbdStdBlockName, BlockSpec> = {
  // ─── Boolean Logic ───────────────────────────────────────
  AND: {
    name: "AND",
    innerSymbol: "&",
    ports: [
      { name: "IN1", side: "in", dataType: "bool", variadic: true },
      { name: "IN2", side: "in", dataType: "bool", variadic: true },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  OR: {
    name: "OR",
    innerSymbol: "≥1",
    ports: [
      { name: "IN1", side: "in", dataType: "bool", variadic: true },
      { name: "IN2", side: "in", dataType: "bool", variadic: true },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  NOT: {
    name: "NOT",
    innerSymbol: "1",
    outputNegated: true,
    ports: [
      { name: "IN", side: "in", dataType: "bool" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  NAND: {
    name: "NAND",
    innerSymbol: "&",
    outputNegated: true,
    ports: [
      { name: "IN1", side: "in", dataType: "bool", variadic: true },
      { name: "IN2", side: "in", dataType: "bool", variadic: true },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  NOR: {
    name: "NOR",
    innerSymbol: "≥1",
    outputNegated: true,
    ports: [
      { name: "IN1", side: "in", dataType: "bool", variadic: true },
      { name: "IN2", side: "in", dataType: "bool", variadic: true },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  XOR: {
    name: "XOR",
    innerSymbol: "=1",
    ports: [
      { name: "IN1", side: "in", dataType: "bool" },
      { name: "IN2", side: "in", dataType: "bool" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  XNOR: {
    name: "XNOR",
    innerSymbol: "=1",
    outputNegated: true,
    ports: [
      { name: "IN1", side: "in", dataType: "bool" },
      { name: "IN2", side: "in", dataType: "bool" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  BUF: {
    name: "BUF",
    innerSymbol: "1",
    ports: [
      { name: "IN", side: "in", dataType: "bool" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },

  // ─── Edge Detect ─────────────────────────────────────────
  R_TRIG: {
    name: "R_TRIG",
    ports: [
      { name: "CLK", side: "in", dataType: "bool" },
      { name: "Q", side: "out", dataType: "bool" },
    ],
    primaryOut: "Q",
  },
  F_TRIG: {
    name: "F_TRIG",
    ports: [
      { name: "CLK", side: "in", dataType: "bool" },
      { name: "Q", side: "out", dataType: "bool" },
    ],
    primaryOut: "Q",
  },

  // ─── Bistable ────────────────────────────────────────────
  SR: {
    name: "SR",
    ports: [
      { name: "S1", side: "in", dataType: "bool" },
      { name: "R", side: "in", dataType: "bool" },
      { name: "Q1", side: "out", dataType: "bool" },
    ],
    primaryOut: "Q1",
  },
  RS: {
    name: "RS",
    ports: [
      { name: "S", side: "in", dataType: "bool" },
      { name: "R1", side: "in", dataType: "bool" },
      { name: "Q1", side: "out", dataType: "bool" },
    ],
    primaryOut: "Q1",
  },

  // ─── Timers ──────────────────────────────────────────────
  TON: {
    name: "TON",
    ports: [
      { name: "IN", side: "in", dataType: "bool" },
      { name: "PT", side: "in", dataType: "time" },
      { name: "Q", side: "out", dataType: "bool" },
      { name: "ET", side: "out", dataType: "time" },
    ],
    primaryOut: "Q",
  },
  TOF: {
    name: "TOF",
    ports: [
      { name: "IN", side: "in", dataType: "bool" },
      { name: "PT", side: "in", dataType: "time" },
      { name: "Q", side: "out", dataType: "bool" },
      { name: "ET", side: "out", dataType: "time" },
    ],
    primaryOut: "Q",
  },
  TP: {
    name: "TP",
    ports: [
      { name: "IN", side: "in", dataType: "bool" },
      { name: "PT", side: "in", dataType: "time" },
      { name: "Q", side: "out", dataType: "bool" },
      { name: "ET", side: "out", dataType: "time" },
    ],
    primaryOut: "Q",
  },

  // ─── Counters ────────────────────────────────────────────
  CTU: {
    name: "CTU",
    ports: [
      { name: "CU", side: "in", dataType: "bool" },
      { name: "R", side: "in", dataType: "bool" },
      { name: "PV", side: "in", dataType: "int" },
      { name: "Q", side: "out", dataType: "bool" },
      { name: "CV", side: "out", dataType: "int" },
    ],
    primaryOut: "Q",
  },
  CTD: {
    name: "CTD",
    ports: [
      { name: "CD", side: "in", dataType: "bool" },
      { name: "LD", side: "in", dataType: "bool" },
      { name: "PV", side: "in", dataType: "int" },
      { name: "Q", side: "out", dataType: "bool" },
      { name: "CV", side: "out", dataType: "int" },
    ],
    primaryOut: "Q",
  },

  // ─── Math ────────────────────────────────────────────────
  ADD: {
    name: "ADD",
    ports: [
      { name: "IN1", side: "in", dataType: "real", variadic: true },
      { name: "IN2", side: "in", dataType: "real", variadic: true },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  SUB: {
    name: "SUB",
    ports: [
      { name: "IN1", side: "in", dataType: "real" },
      { name: "IN2", side: "in", dataType: "real" },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    primaryOut: "OUT",
  },
  MUL: {
    name: "MUL",
    ports: [
      { name: "IN1", side: "in", dataType: "real", variadic: true },
      { name: "IN2", side: "in", dataType: "real", variadic: true },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  DIV: {
    name: "DIV",
    ports: [
      { name: "IN1", side: "in", dataType: "real" },
      { name: "IN2", side: "in", dataType: "real" },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    primaryOut: "OUT",
  },
  MOD: {
    name: "MOD",
    ports: [
      { name: "IN1", side: "in", dataType: "int" },
      { name: "IN2", side: "in", dataType: "int" },
      { name: "OUT", side: "out", dataType: "int" },
    ],
    primaryOut: "OUT",
  },
  ABS: {
    name: "ABS",
    ports: [
      { name: "IN", side: "in", dataType: "real" },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    primaryOut: "OUT",
  },
  NEG: {
    name: "NEG",
    ports: [
      { name: "IN", side: "in", dataType: "real" },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    primaryOut: "OUT",
  },
  MOVE: {
    name: "MOVE",
    ports: [
      { name: "IN", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "any" },
    ],
    primaryOut: "OUT",
  },

  // ─── Comparison ──────────────────────────────────────────
  EQ: {
    name: "EQ",
    ports: [
      { name: "IN1", side: "in", dataType: "any" },
      { name: "IN2", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  NE: {
    name: "NE",
    ports: [
      { name: "IN1", side: "in", dataType: "any" },
      { name: "IN2", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  GT: {
    name: "GT",
    ports: [
      { name: "IN1", side: "in", dataType: "any" },
      { name: "IN2", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  GE: {
    name: "GE",
    ports: [
      { name: "IN1", side: "in", dataType: "any" },
      { name: "IN2", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  LT: {
    name: "LT",
    ports: [
      { name: "IN1", side: "in", dataType: "any" },
      { name: "IN2", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },
  LE: {
    name: "LE",
    ports: [
      { name: "IN1", side: "in", dataType: "any" },
      { name: "IN2", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "bool" },
    ],
    primaryOut: "OUT",
  },

  // ─── Selection ───────────────────────────────────────────
  SEL: {
    name: "SEL",
    ports: [
      { name: "G", side: "in", dataType: "bool" },
      { name: "IN0", side: "in", dataType: "any" },
      { name: "IN1", side: "in", dataType: "any" },
      { name: "OUT", side: "out", dataType: "any" },
    ],
    primaryOut: "OUT",
  },
  MUX: {
    name: "MUX",
    ports: [
      { name: "K", side: "in", dataType: "int" },
      { name: "IN0", side: "in", dataType: "any", variadic: true },
      { name: "IN1", side: "in", dataType: "any", variadic: true },
      { name: "OUT", side: "out", dataType: "any" },
    ],
    primaryOut: "OUT",
  },
  MAX: {
    name: "MAX",
    ports: [
      { name: "IN1", side: "in", dataType: "real", variadic: true },
      { name: "IN2", side: "in", dataType: "real", variadic: true },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  MIN: {
    name: "MIN",
    ports: [
      { name: "IN1", side: "in", dataType: "real", variadic: true },
      { name: "IN2", side: "in", dataType: "real", variadic: true },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    defaultInputs: 2,
    primaryOut: "OUT",
  },
  LIMIT: {
    name: "LIMIT",
    ports: [
      { name: "MN", side: "in", dataType: "real" },
      { name: "IN", side: "in", dataType: "real" },
      { name: "MX", side: "in", dataType: "real" },
      { name: "OUT", side: "out", dataType: "real" },
    ],
    primaryOut: "OUT",
  },
};

export function isStdBlock(name: string): name is FbdStdBlockName {
  return name in BLOCK_SPECS;
}

export function getBlockSpec(name: FbdStdBlockName): BlockSpec {
  return BLOCK_SPECS[name];
}
