/**
 * BPMN parser — DSL → BpmnAst.
 *
 * Grammar (v0.1, see docs/reference/25-BPMN-STANDARD.md §5):
 *
 *   bpmn
 *   direction: LR | TB
 *   title: "..."
 *
 *   pool "Customer" blackbox
 *
 *   pool "Bank" {
 *     lane "Clerk" {
 *       id: start "label"
 *       id: task user "label"
 *       id: gateway xor "label"
 *       id: end "label"
 *     }
 *   }
 *
 *   flows
 *   A --> B
 *   G1 --? "yes" --> C
 *   G1 --* "default" --> F
 *   "Customer" ~~> A : "Submit"
 *
 * Validation enforced here:
 *   - Pool / lane / object id uniqueness within a pool.
 *   - Black-box pools have no children.
 *   - Sequence flow stays inside one pool.
 *   - Message flow crosses pool boundaries.
 *   - At most one default flow per gateway.
 */
import type {
  BpmnActivity,
  BpmnAst,
  BpmnDirection,
  BpmnEvent,
  BpmnFlow,
  BpmnFlowKind,
  BpmnGateway,
  BpmnGatewayKind,
  BpmnLane,
  BpmnPool,
  BpmnTaskMarker,
} from "../../core/types";
import { IDENTIFIER_SOURCE, readIdentifier } from "../../core/identifier";

const FLOW_OBJECT_PREFIX_RE = new RegExp(`^${IDENTIFIER_SOURCE}\\s*:`, "u");
const FLOW_OBJECT_RE = new RegExp(`^(${IDENTIFIER_SOURCE})\\s*:\\s*(.+)$`, "u");

export class BpmnParseError extends Error {
  constructor(message: string, public line: number) {
    super(`bpmn:${line}: ${message}`);
    this.name = "BpmnParseError";
  }
}

interface Line {
  /** Trimmed source. */
  text: string;
  /** 1-based source line number. */
  no: number;
}

const STRING_RE = /"((?:\\.|[^"\\])*)"/;

function unquote(s: string): string {
  return s.replace(/^"|"$/g, "").replace(/\\"/g, '"');
}

function takeQuoted(rest: string): { value: string; rest: string } | null {
  const m = rest.match(/^\s*"((?:\\.|[^"\\])*)"\s*/);
  if (!m) return null;
  return { value: m[1]!.replace(/\\"/g, '"'), rest: rest.slice(m[0].length) };
}

function preprocessLines(text: string): Line[] {
  const out: Line[] = [];
  const raw = text.split(/\r?\n/);
  for (let i = 0; i < raw.length; i++) {
    let s = raw[i]!;
    // strip line comments — // and # at column start (or after whitespace)
    // Don't strip inside quoted strings: walk char-by-char.
    let inStr = false;
    let stripFrom = -1;
    for (let j = 0; j < s.length; j++) {
      const c = s[j]!;
      if (c === '"' && (j === 0 || s[j - 1] !== "\\")) inStr = !inStr;
      if (inStr) continue;
      if (c === "/" && s[j + 1] === "/") { stripFrom = j; break; }
      if (c === "#") { stripFrom = j; break; }
    }
    if (stripFrom >= 0) s = s.slice(0, stripFrom);
    s = s.trim();
    if (s.length === 0) continue;
    out.push({ text: s, no: i + 1 });
  }
  return out;
}

export function parseBpmn(text: string): BpmnAst {
  const lines = preprocessLines(text);
  if (lines.length === 0) throw new BpmnParseError("empty input", 1);

  // Header: "bpmn" must be the first line.
  if (lines[0]!.text.toLowerCase().split(/\s+/)[0] !== "bpmn") {
    throw new BpmnParseError(
      "diagram must start with `bpmn` keyword",
      lines[0]!.no
    );
  }

  let direction: BpmnDirection = "LR";
  let title: string | undefined;
  const pools: BpmnPool[] = [];
  const lanesById = new Map<string, BpmnLane>();
  const events: BpmnEvent[] = [];
  const activities: BpmnActivity[] = [];
  const gateways: BpmnGateway[] = [];
  const flows: BpmnFlow[] = [];

  // Object id → owning pool/lane (for cross-checks during flow parsing).
  const objectOwner = new Map<string, { poolId: string; laneId: string }>();
  // Pool labels can be referenced by quoted name in message flows.
  const poolByLabel = new Map<string, BpmnPool>();

  let cursor = 1;

  // ── Header lines: direction / title / pools / flows ─────────
  while (cursor < lines.length) {
    const ln = lines[cursor]!;
    const lower = ln.text.toLowerCase();

    if (lower.startsWith("direction:")) {
      const v = ln.text.slice("direction:".length).trim().toUpperCase();
      if (v !== "LR" && v !== "TB") {
        throw new BpmnParseError(
          `direction must be LR or TB (got '${v}')`,
          ln.no
        );
      }
      direction = v as BpmnDirection;
      cursor++;
      continue;
    }
    if (lower.startsWith("title:")) {
      const rest = ln.text.slice("title:".length).trim();
      const q = takeQuoted(rest);
      if (q) title = q.value;
      else title = rest;
      cursor++;
      continue;
    }

    if (lower === "flows" || lower.startsWith("flows ")) {
      cursor++;
      while (cursor < lines.length) {
        parseFlowLine(lines[cursor]!, flows, objectOwner, poolByLabel);
        cursor++;
      }
      break;
    }

    if (lower.startsWith("pool")) {
      cursor = parsePool(lines, cursor, pools, lanesById, events, activities, gateways, objectOwner, poolByLabel);
      continue;
    }

    throw new BpmnParseError(
      `unexpected token at top level: '${ln.text.slice(0, 32)}'`,
      ln.no
    );
  }

  // ── Cross-validations ──────────────────────────────────────

  // Black-box pools must have zero objects.
  for (const p of pools) {
    if (!p.blackbox) continue;
    const hasObjs = [...events, ...activities, ...gateways].some(
      (o) => o.poolId === p.id
    );
    if (hasObjs) {
      throw new BpmnParseError(
        `black-box pool "${p.label}" cannot contain flow objects`,
        1
      );
    }
  }

  // Sequence/conditional/default flows must stay in the same pool.
  // Message flows must cross pool boundaries.
  for (const f of flows) {
    if (f.kind === "message") continue;
    const fromOwn = objectOwner.get(f.from);
    const toOwn = objectOwner.get(f.to);
    if (!fromOwn) throw new BpmnParseError(`unknown source '${f.from}' in sequence flow`, 1);
    if (!toOwn) throw new BpmnParseError(`unknown target '${f.to}' in sequence flow`, 1);
    if (fromOwn.poolId !== toOwn.poolId) {
      throw new BpmnParseError(
        `sequence flow '${f.from} --> ${f.to}' crosses pool boundary — use message flow (~~>)`,
        1
      );
    }
  }
  for (const f of flows) {
    if (f.kind !== "message") continue;
    const fromIsPool = poolByLabel.has(f.from);
    const toIsPool = poolByLabel.has(f.to);
    const fromOwn = objectOwner.get(f.from);
    const toOwn = objectOwner.get(f.to);
    const fromPool = fromIsPool ? poolByLabel.get(f.from)!.id : fromOwn?.poolId;
    const toPool = toIsPool ? poolByLabel.get(f.to)!.id : toOwn?.poolId;
    if (!fromPool || !toPool) {
      throw new BpmnParseError(
        `unknown endpoint in message flow '${f.from} ~~> ${f.to}'`,
        1
      );
    }
    if (fromPool === toPool) {
      throw new BpmnParseError(
        `message flow '${f.from} ~~> ${f.to}' must cross pool boundaries`,
        1
      );
    }
  }

  // ≤1 default flow per gateway.
  const defaultsBySrc = new Map<string, number>();
  for (const f of flows) {
    if (f.kind !== "default") continue;
    defaultsBySrc.set(f.from, (defaultsBySrc.get(f.from) ?? 0) + 1);
  }
  for (const [src, n] of defaultsBySrc) {
    if (n > 1) {
      throw new BpmnParseError(
        `gateway '${src}' has ${n} default flows (max 1)`,
        1
      );
    }
  }

  return {
    type: "bpmn",
    direction,
    title,
    pools,
    lanes: pools.flatMap((p) => p.lanes.map((id) => lanesById.get(id)!).filter(Boolean)),
    events,
    activities,
    gateways,
    flows,
  };
}

// ─── Pool / lane parsing ───────────────────────────────────────

function parsePool(
  lines: Line[],
  startIdx: number,
  pools: BpmnPool[],
  lanesById: Map<string, BpmnLane>,
  events: BpmnEvent[],
  activities: BpmnActivity[],
  gateways: BpmnGateway[],
  objectOwner: Map<string, { poolId: string; laneId: string }>,
  poolByLabel: Map<string, BpmnPool>
): number {
  const ln = lines[startIdx]!;
  // pool "Label" [blackbox] [{]
  const m = ln.text.match(/^pool\s+("(?:\\.|[^"\\])*")\s*(.*)$/);
  if (!m) throw new BpmnParseError("malformed pool declaration", ln.no);
  const label = unquote(m[1]!);
  const tail = m[2]!.trim();

  let blackbox = false;
  let hasBrace = false;
  let after = tail;
  if (after.startsWith("blackbox")) {
    blackbox = true;
    after = after.slice("blackbox".length).trim();
  }
  if (after === "{") hasBrace = true;
  else if (after.length > 0)
    throw new BpmnParseError(`unexpected tokens after pool header: '${after}'`, ln.no);

  const poolId = `__pool_${pools.length}`;
  const pool: BpmnPool = { id: poolId, label, blackbox, lanes: [] };
  pools.push(pool);
  if (poolByLabel.has(label)) {
    throw new BpmnParseError(`duplicate pool label "${label}"`, ln.no);
  }
  poolByLabel.set(label, pool);

  if (!hasBrace) {
    // Single-line pool declaration (typical for blackbox).
    return startIdx + 1;
  }

  let i = startIdx + 1;
  while (i < lines.length) {
    const cur = lines[i]!;
    if (cur.text === "}") return i + 1;

    if (cur.text.toLowerCase().startsWith("lane")) {
      i = parseLane(lines, i, pool, lanesById, events, activities, gateways, objectOwner);
      continue;
    }

    // Pool with no lanes — flow objects directly inside pool. Treat as a
    // single implicit lane.
    if (FLOW_OBJECT_PREFIX_RE.test(cur.text)) {
      // create implicit lane lazily
      let implicit = pool.lanes
        .map((id) => lanesById.get(id))
        .find((l) => l?.label === "");
      if (!implicit) {
        const laneId = `${poolId}__lane_implicit`;
        implicit = { id: laneId, label: "", poolId, children: [] };
        lanesById.set(laneId, implicit);
        pool.lanes.push(laneId);
      }
      i = parseFlowObject(lines, i, pool, implicit, events, activities, gateways, objectOwner);
      continue;
    }

    throw new BpmnParseError(
      `unexpected token inside pool: '${cur.text.slice(0, 32)}'`,
      cur.no
    );
  }
  throw new BpmnParseError(`unterminated pool block (missing '}')`, ln.no);
}

function parseLane(
  lines: Line[],
  startIdx: number,
  pool: BpmnPool,
  lanesById: Map<string, BpmnLane>,
  events: BpmnEvent[],
  activities: BpmnActivity[],
  gateways: BpmnGateway[],
  objectOwner: Map<string, { poolId: string; laneId: string }>
): number {
  const ln = lines[startIdx]!;
  const m = ln.text.match(/^lane\s+("(?:\\.|[^"\\])*")\s*\{?\s*$/);
  if (!m) throw new BpmnParseError("malformed lane declaration", ln.no);
  const label = unquote(m[1]!);
  const hasBrace = ln.text.endsWith("{");

  if (pool.blackbox) {
    throw new BpmnParseError(
      `black-box pool "${pool.label}" cannot contain lanes`,
      ln.no
    );
  }

  const laneId = `${pool.id}__lane_${pool.lanes.length}`;
  const lane: BpmnLane = { id: laneId, label, poolId: pool.id, children: [] };
  lanesById.set(laneId, lane);
  pool.lanes.push(laneId);

  if (!hasBrace) return startIdx + 1;

  let i = startIdx + 1;
  while (i < lines.length) {
    const cur = lines[i]!;
    if (cur.text === "}") return i + 1;
    i = parseFlowObject(lines, i, pool, lane, events, activities, gateways, objectOwner);
  }
  throw new BpmnParseError(`unterminated lane block (missing '}')`, ln.no);
}

// ─── Flow-object parsing ───────────────────────────────────────

function parseFlowObject(
  lines: Line[],
  idx: number,
  pool: BpmnPool,
  lane: BpmnLane,
  events: BpmnEvent[],
  activities: BpmnActivity[],
  gateways: BpmnGateway[],
  objectOwner: Map<string, { poolId: string; laneId: string }>
): number {
  const ln = lines[idx]!;
  const m = ln.text.match(FLOW_OBJECT_RE);
  if (!m) {
    throw new BpmnParseError(
      `expected 'id: kind ...' (got '${ln.text.slice(0, 40)}')`,
      ln.no
    );
  }
  const id = m[1]!;
  let body = m[2]!.trim();

  if (objectOwner.has(id)) {
    throw new BpmnParseError(`duplicate id '${id}'`, ln.no);
  }

  // peel off keyword
  const kw = body.split(/\s+/)[0]!.toLowerCase();
  body = body.slice(kw.length).trim();

  if (kw === "start" || kw === "end" || kw === "intermediate") {
    // optional trigger keyword
    let trigger: BpmnEvent["trigger"] = "none";
    const next = body.split(/\s+/)[0]?.toLowerCase() ?? "";
    if (next === "message" || next === "timer" || next === "none") {
      trigger = next as BpmnEvent["trigger"];
      body = body.slice(next.length).trim();
    }
    let label: string | undefined;
    const q = takeQuoted(body);
    if (q) label = q.value;
    // throw vs catch: end events with a trigger throw; start always catch;
    // intermediate without context catch (v0.1 simplification).
    let throwCatch: BpmnEvent["throwCatch"] = "catch";
    if (kw === "end" && trigger !== "none") throwCatch = "throw";
    if (kw === "end" && trigger === "none") throwCatch = "throw"; // none-end is a terminator
    const ev: BpmnEvent = {
      id,
      kind: kw as BpmnEvent["kind"],
      trigger,
      throwCatch,
      label,
      laneId: lane.id,
      poolId: pool.id,
    };
    events.push(ev);
    lane.children.push(id);
    objectOwner.set(id, { poolId: pool.id, laneId: lane.id });
    return idx + 1;
  }

  if (kw === "task") {
    // optional marker + label
    let marker: BpmnTaskMarker = "abstract";
    const next = body.split(/\s+/)[0]?.toLowerCase() ?? "";
    if (
      next === "user" || next === "service" || next === "send" ||
      next === "receive" || next === "manual" || next === "script"
    ) {
      marker = next as BpmnTaskMarker;
      body = body.slice(next.length).trim();
    }
    const q = takeQuoted(body);
    if (!q) {
      throw new BpmnParseError(`task '${id}' must have a quoted label`, ln.no);
    }
    const a: BpmnActivity = {
      id,
      kind: "task",
      marker,
      label: q.value,
      laneId: lane.id,
      poolId: pool.id,
    };
    activities.push(a);
    lane.children.push(id);
    objectOwner.set(id, { poolId: pool.id, laneId: lane.id });
    return idx + 1;
  }

  if (kw === "subprocess") {
    const q = takeQuoted(body);
    if (!q) {
      throw new BpmnParseError(
        `subprocess '${id}' must have a quoted label`,
        ln.no
      );
    }
    const after = q.rest.trim();
    if (after !== "" && after !== "collapsed") {
      throw new BpmnParseError(
        `subprocess '${id}': v0.1 supports collapsed subprocesses only (got '${after}')`,
        ln.no
      );
    }
    const a: BpmnActivity = {
      id,
      kind: "subprocess-collapsed",
      marker: "abstract",
      label: q.value,
      laneId: lane.id,
      poolId: pool.id,
    };
    activities.push(a);
    lane.children.push(id);
    objectOwner.set(id, { poolId: pool.id, laneId: lane.id });
    return idx + 1;
  }

  if (kw === "gateway") {
    const next = body.split(/\s+/)[0]?.toLowerCase() ?? "";
    let gatewayKind: BpmnGatewayKind;
    if (next === "xor" || next === "or" || next === "and" || next === "event") {
      gatewayKind = next as BpmnGatewayKind;
      body = body.slice(next.length).trim();
    } else {
      throw new BpmnParseError(
        `gateway '${id}' kind must be xor / or / and / event (got '${next}')`,
        ln.no
      );
    }
    let label: string | undefined;
    const q = takeQuoted(body);
    if (q) label = q.value;
    const g: BpmnGateway = {
      id,
      gatewayKind,
      label,
      laneId: lane.id,
      poolId: pool.id,
    };
    gateways.push(g);
    lane.children.push(id);
    objectOwner.set(id, { poolId: pool.id, laneId: lane.id });
    return idx + 1;
  }

  throw new BpmnParseError(
    `unknown flow-object kind '${kw}' for id '${id}'`,
    ln.no
  );
}

// ─── Flow-line parsing ────────────────────────────────────────

function parseFlowLine(
  ln: Line,
  flows: BpmnFlow[],
  objectOwner: Map<string, { poolId: string; laneId: string }>,
  poolByLabel: Map<string, BpmnPool>
): void {
  // Tolerate stand-alone "flows" repeats.
  if (ln.text.toLowerCase() === "flows") return;

  const text = ln.text;

  // Endpoint: bare id OR quoted pool name.
  function takeEndpoint(s: string): { ep: string; rest: string } | null {
    const t = s.trimStart();
    if (t.startsWith('"')) {
      const q = takeQuoted(t);
      if (!q) return null;
      return { ep: q.value, rest: q.rest };
    }
    const id = readIdentifier(t);
    if (!id) return null;
    return { ep: id.value, rest: t.slice(id.end).trimStart() };
  }

  const head = takeEndpoint(text);
  if (!head) {
    throw new BpmnParseError(
      `flow line: cannot parse source endpoint`,
      ln.no
    );
  }
  let rest = head.rest.trimStart();

  // Detect connector kind.
  let kind: BpmnFlowKind;
  let connectorLen: number;
  let connectorLabel: string | undefined;

  if (rest.startsWith("~~>")) {
    kind = "message";
    connectorLen = 3;
  } else if (rest.startsWith("--?")) {
    // conditional with inline quoted label, then -->
    kind = "conditional";
    let r = rest.slice(3).trimStart();
    const q = takeQuoted(r);
    if (q) {
      connectorLabel = q.value;
      r = q.rest.trimStart();
    }
    if (!r.startsWith("-->")) {
      throw new BpmnParseError(
        `conditional flow must end with --> (got '${r.slice(0, 20)}')`,
        ln.no
      );
    }
    connectorLen = rest.length - r.length + 3;
  } else if (rest.startsWith("--*")) {
    kind = "default";
    let r = rest.slice(3).trimStart();
    const q = takeQuoted(r);
    if (q) {
      connectorLabel = q.value;
      r = q.rest.trimStart();
    }
    if (!r.startsWith("-->")) {
      throw new BpmnParseError(
        `default flow must end with --> (got '${r.slice(0, 20)}')`,
        ln.no
      );
    }
    connectorLen = rest.length - r.length + 3;
  } else if (rest.startsWith("-->")) {
    kind = "sequence";
    connectorLen = 3;
  } else {
    throw new BpmnParseError(
      `unknown flow connector at '${rest.slice(0, 20)}' — use --> / --? / --* / ~~>`,
      ln.no
    );
  }

  rest = rest.slice(connectorLen).trimStart();
  const tail = takeEndpoint(rest);
  if (!tail) {
    throw new BpmnParseError(`flow line: cannot parse target endpoint`, ln.no);
  }
  const trailing = tail.rest.trimStart();

  // Optional `: "label"` (mainly for message flows but allowed everywhere).
  let label: string | undefined = connectorLabel;
  if (trailing.startsWith(":")) {
    const q = takeQuoted(trailing.slice(1));
    if (q) label = q.value;
  }

  // For message flows, endpoints may be pool names (quoted) — keep raw.
  // Sequence-class flows must have flow-object ids on both ends.
  if (kind !== "message") {
    if (poolByLabel.has(head.ep) || poolByLabel.has(tail.ep)) {
      throw new BpmnParseError(
        `non-message flow cannot use a pool name as endpoint`,
        ln.no
      );
    }
    if (!objectOwner.has(head.ep)) {
      throw new BpmnParseError(`unknown source id '${head.ep}'`, ln.no);
    }
    if (!objectOwner.has(tail.ep)) {
      throw new BpmnParseError(`unknown target id '${tail.ep}'`, ln.no);
    }
  } else {
    const fromOk = poolByLabel.has(head.ep) || objectOwner.has(head.ep);
    const toOk = poolByLabel.has(tail.ep) || objectOwner.has(tail.ep);
    if (!fromOk) throw new BpmnParseError(`unknown source '${head.ep}' in message flow`, ln.no);
    if (!toOk) throw new BpmnParseError(`unknown target '${tail.ep}' in message flow`, ln.no);
  }

  flows.push({ from: head.ep, to: tail.ep, kind, label });
}

// Re-export helpers in case tests want them.
export { STRING_RE };
