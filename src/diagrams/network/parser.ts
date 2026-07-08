/**
 * Network topology — DSL parser (text → NetworkAst).
 *
 * Hand-written, indentation-tolerant, AI-friendly. Spec: §4.
 */

import type {
  CameraType,
  DeviceKind,
  DeviceTier,
  GroupKind,
  LinkType,
  NetworkAst,
  NetworkDevice,
  NetworkGroup,
  NetworkLayoutMode,
  NetworkLink,
} from "./types";

export class NetworkParseError extends Error {
  override name = "NetworkParseError";
}

// ─── Vocabulary ──────────────────────────────────────────────────

const DEVICE_KINDS = new Set<DeviceKind>([
  "router", "switch", "l3switch", "firewall", "loadbalancer", "ap", "wlc",
  "gateway", "modem", "ids", "proxy", "vpngw",
  "server", "serverfarm", "pc", "laptop", "mobile", "ipphone", "printer", "storage",
  "camera", "nvr", "dvr", "poeswitch", "encoder", "monitor",
  "internet", "wan", "cloud", "pstn", "lan",
]);

/** Aliases → canonical device kind. */
const KIND_ALIASES: Record<string, DeviceKind> = {
  multilayer: "l3switch",
  wifi: "ap",
  workstation: "pc",
  phone: "mobile",
  voip: "ipphone",
  nas: "storage",
  san: "storage",
  servers: "serverfarm",
  ips: "ids",
  decoder: "encoder",
  videowall: "monitor",
  segment: "lan",
  // Common everyday synonyms a model reaches for. A specific server role still
  // renders as a generic `server` (with its label) instead of hard-failing.
  webserver: "server",
  mailserver: "server",
  dns: "server",
  dhcp: "server",
  ntp: "server",
  database: "server",
  dbserver: "server",
  db: "server",
  vm: "server",
  host: "server",
  hypervisor: "server",
  activedirectory: "server",
  domaincontroller: "server",
  desktop: "pc",
  smartphone: "mobile",
  tablet: "mobile",
  accesspoint: "ap",
  wap: "ap",
  hub: "switch",
  bridge: "switch",
  l2switch: "switch",
  ngfw: "firewall",
  utm: "firewall",
  mfp: "printer",
};

const GROUP_KINDS = new Set<string>(["site", "building", "campus", "rack", "subnet", "vlan", "zone", "dmz"]);
const GROUP_KIND_ALIAS: Record<string, GroupKind> = { building: "site", campus: "site" };

const TIERS = new Set<DeviceTier>(["edge", "core", "distribution", "access"]);
const CAMERA_TYPES = new Set<CameraType>(["fixed", "bullet", "dome", "ptz", "turret"]);
const LAYOUT_MODES = new Set<NetworkLayoutMode>([
  "tiered", "tree", "star", "ring", "bus", "mesh", "spine-leaf", "manual",
]);

const LINK_TYPE_KEYWORDS: Record<string, LinkType> = {
  copper: "copper", ethernet: "copper",
  fiber: "fiber", fibre: "fiber",
  wireless: "wireless", wifi: "wireless",
  serial: "serial", wan: "serial",
  poe: "poe",
  vpn: "vpn",
  lag: "lag", portchannel: "lag",
};

const CONNECTORS = new Set(["--", "->", "=="]);
const SPEED_RE = /^\d+(?:\.\d+)?[MGT]$/;

// ─── Tokenizer ───────────────────────────────────────────────────

interface Token {
  value: string;
  /** True when the token came from a quoted string (label). */
  str: boolean;
}

const QUOTE_RE = /"([^"]*)"|「([^」]*)」|『([^』]*)』|“([^”]*)”|«([^»]*)»|'([^']*)'/g;

/** Drop a trailing `#`/`//` comment that is not inside a quoted region. */
function stripComment(line: string): string {
  let inQuote = false;
  let close = "";
  const pairs: Record<string, string> = { '"': '"', "「": "」", "『": "』", "“": "”", "«": "»", "'": "'" };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuote) {
      if (ch === close) inQuote = false;
      continue;
    }
    if (pairs[ch]) {
      inQuote = true;
      close = pairs[ch]!;
      continue;
    }
    if (ch === "#") return line.slice(0, i);
    if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
  }
  return line;
}

/** Split a (comment-stripped) line on `;` statement separators outside quotes. */
function splitStatements(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  let close = "";
  const pairs: Record<string, string> = { '"': '"', "「": "」", "『": "』", "“": "”", "«": "»", "'": "'" };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuote) {
      if (ch === close) inQuote = false;
      buf += ch;
      continue;
    }
    if (pairs[ch]) { inQuote = true; close = pairs[ch]!; buf += ch; continue; }
    if (ch === ";") { out.push(buf); buf = ""; continue; }
    buf += ch;
  }
  out.push(buf);
  return out;
}

function tokenize(raw: string): Token[] {
  const line = stripComment(raw);
  const strings: string[] = [];
  // Mask quoted regions so connector/colon splitting never touches label text.
  const masked = line.replace(QUOTE_RE, (...m) => {
    const inner = m.slice(1, 7).find((g) => g !== undefined) ?? "";
    strings.push(inner);
    return ` @@${strings.length - 1}@@ `;
  });
  // Space-pad connectors so `a--b` == `a -- b`.
  const spaced = masked.replace(/(--|->|==)/g, " $1 ");
  const out: Token[] = [];
  for (const w of spaced.split(/\s+/)) {
    if (!w) continue;
    const sm = /^@@(\d+)@@$/.exec(w);
    if (sm) {
      out.push({ value: strings[Number(sm[1])] ?? "", str: true });
    } else {
      out.push({ value: w, str: false });
    }
  }
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
    }
  }
  return d[m]![n]!;
}

function nearestKind(bad: string): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const k of [...DEVICE_KINDS, ...Object.keys(KIND_ALIASES)]) {
    const dist = levenshtein(bad.toLowerCase(), k);
    if (dist < bestDist) { bestDist = dist; best = k; }
  }
  return bestDist <= 3 ? best : undefined;
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let v = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    v = v * 256 + n;
  }
  return v >>> 0;
}

/** True if `ip` falls inside CIDR `net/prefix`. Null when the CIDR is unparseable. */
function ipInCidr(ip: string, cidr: string): boolean | null {
  const m = /^(\d+\.\d+\.\d+\.\d+)\s*\/\s*(\d+)$/.exec(cidr.trim());
  if (!m) return null;
  const netInt = ipToInt(m[1]!);
  const prefix = Number(m[2]);
  const hostInt = ipToInt(ip.split("/")[0]!);
  if (netInt === null || hostInt === null || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (netInt & mask) === (hostInt & mask);
}

const SWITCH_CLASS = new Set<DeviceKind>(["switch", "l3switch", "poeswitch"]);

// ─── Parser ──────────────────────────────────────────────────────

export function parseNetwork(text: string): NetworkAst {
  const ast: NetworkAst = {
    type: "network",
    layout: "tiered",
    direction: "tb",
    spines: [],
    leaves: [],
    devices: [],
    links: [],
    groups: [],
    warnings: [],
  };

  const deviceById = new Map<string, NetworkDevice>();
  const groupById = new Map<string, NetworkGroup>();
  const groupStack: NetworkGroup[] = [];
  let headerSeen = false;

  const rawLines = text.split(/\r?\n/);

  const addDevice = (d: NetworkDevice, lineNo: number) => {
    if (deviceById.has(d.id)) {
      throw new NetworkParseError(`device id "${d.id}" already declared (line ${lineNo})`);
    }
    deviceById.set(d.id, d);
    ast.devices.push(d);
    const top = groupStack[groupStack.length - 1];
    if (top && !top.members.includes(d.id)) top.members.push(d.id);
  };

  const ensureDevice = (id: string, kind: DeviceKind): NetworkDevice => {
    let d = deviceById.get(id);
    if (!d) {
      d = { id, kind, groups: [] };
      deviceById.set(id, d);
      ast.devices.push(d);
    }
    return d;
  };

  // Parse `key:`/value attribute pairs onto a device.
  const applyAttrs = (d: NetworkDevice, toks: Token[], start: number, lineNo: number) => {
    let i = start;
    while (i < toks.length) {
      const tk = toks[i]!;
      if (tk.str) { i++; continue; }
      const key = tk.value.endsWith(":") ? tk.value.slice(0, -1) : null;
      if (key === null) { i++; continue; }
      const val = toks[i + 1];
      i += 2;
      if (!val) continue;
      switch (key) {
        case "tier":
          if (TIERS.has(val.value as DeviceTier)) d.tier = val.value as DeviceTier;
          break;
        case "type":
          if (CAMERA_TYPES.has(val.value as CameraType)) d.cameraType = val.value as CameraType;
          break;
        case "ip": d.ip = val.value; break;
        case "model": d.model = val.value; break;
        case "count": { const n = Number(val.value); if (Number.isFinite(n)) d.count = n; break; }
        case "icon": d.icon = val.value; break;
        case "at": {
          const mm = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(val.value);
          if (mm) d.at = { x: Number(mm[1]), y: Number(mm[2]) };
          break;
        }
        default:
          ast.warnings.push(`unknown attribute "${key}:" on device "${d.id}" (line ${lineNo})`);
      }
    }
  };

  const statements: Array<{ text: string; no: number }> = [];
  rawLines.forEach((raw, i) => {
    for (const seg of splitStatements(stripComment(raw))) statements.push({ text: seg, no: i + 1 });
  });

  for (const stmt of statements) {
    const lineNo = stmt.no;
    const toks = tokenize(stmt.text);
    if (toks.length === 0) continue;
    const t0 = toks[0]!;

    // ── header ──
    if (!headerSeen) {
      if (!t0.str && /^(network|topology)$/i.test(t0.value)) {
        headerSeen = true;
        if (toks[1]?.str) ast.title = toks[1]!.value;
        continue;
      }
      throw new NetworkParseError(
        `network diagram must start with "network" or "topology" (line ${lineNo})`,
      );
    }

    // ── group close ──
    if (toks.length === 1 && t0.value === "}") {
      if (groupStack.length === 0) {
        throw new NetworkParseError(`unmatched "}" (line ${lineNo})`);
      }
      groupStack.pop();
      continue;
    }

    // ── directive (key: ... at line start) ──
    if (!t0.str && t0.value.endsWith(":")) {
      const key = t0.value.slice(0, -1).toLowerCase();
      const rest = toks.slice(1);
      switch (key) {
        case "layout": {
          const v = rest[0]?.value as NetworkLayoutMode | undefined;
          if (v && LAYOUT_MODES.has(v)) ast.layout = v;
          else if (v) ast.warnings.push(`unknown layout "${v}" — using "tiered" (line ${lineNo})`);
          break;
        }
        case "direction": {
          const v = rest[0]?.value?.toLowerCase();
          if (v === "tb" || v === "lr") ast.direction = v;
          break;
        }
        case "title": if (rest[0]) ast.title = rest[0]!.value; break;
        case "spines": ast.spines.push(...rest.filter((r) => !r.str).map((r) => r.value)); break;
        case "leaves": ast.leaves.push(...rest.filter((r) => !r.str).map((r) => r.value)); break;
        case "legend": break; // parsed-and-ignored in v0.1
        default: ast.warnings.push(`unknown directive "${key}:" (line ${lineNo})`);
      }
      continue;
    }

    // ── link (contains a connector token) ──
    const ci = toks.findIndex((t) => !t.str && CONNECTORS.has(t.value));
    if (ci >= 0) {
      const fromT = toks[ci - 1];
      const toT = toks[ci + 1];
      if (!fromT || !toT || fromT.str || toT.str) {
        throw new NetworkParseError(`malformed link (line ${lineNo})`);
      }
      const conn = toks[ci]!.value;
      const link: NetworkLink = {
        from: fromT.value,
        to: toT.value,
        directed: conn === "->",
        linkType: conn === "==" ? "lag" : "copper",
        line: lineNo,
      };
      // spec after the target (skip an optional ":" separator)
      let si = ci + 2;
      if (toks[si] && !toks[si]!.str && toks[si]!.value === ":") si++;
      while (si < toks.length) {
        const tk = toks[si]!;
        if (tk.str) { link.label = tk.value; si++; continue; }
        const low = tk.value.toLowerCase();
        if (LINK_TYPE_KEYWORDS[low]) { link.linkType = LINK_TYPE_KEYWORDS[low]!; si++; continue; }
        if (low === "trunk" || low === "access") { link.mode = low; si++; continue; }
        if (SPEED_RE.test(tk.value)) { link.speed = tk.value; si++; continue; }
        if (low === "vlan:") {
          const v = toks[si + 1];
          if (v) {
            link.vlans = v.value.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
            for (const vid of link.vlans) {
              if (vid < 1 || vid > 4094) {
                ast.warnings.push(`VLAN id ${vid} out of range 1–4094 (line ${lineNo})`);
              }
            }
          }
          si += 2; continue;
        }
        if (low === "port:") {
          const v = toks[si + 1];
          if (v) { const [near, far] = v.value.split(">"); link.portNear = near; if (far) link.portFar = far; }
          si += 2; continue;
        }
        if (low === "ip:") { link.ip = toks[si + 1]?.value; si += 2; continue; }
        si++;
      }
      ast.links.push(link);
      continue;
    }

    // ── group open (`<groupkind> id ["label"] {`) ──
    if (!t0.str && GROUP_KINDS.has(t0.value) && toks[toks.length - 1]!.value === "{") {
      const idT = toks[1];
      if (!idT || idT.str) throw new NetworkParseError(`group needs an id (line ${lineNo})`);
      const kind = (GROUP_KIND_ALIAS[t0.value] ?? t0.value) as GroupKind;
      const label = toks[2]?.str ? toks[2]!.value : undefined;
      if (groupById.has(idT.value)) {
        throw new NetworkParseError(`group id "${idT.value}" already declared (line ${lineNo})`);
      }
      const parent = groupStack[groupStack.length - 1];
      const g: NetworkGroup = {
        id: idT.value, kind, label, members: [], children: [], parent: parent?.id, line: lineNo,
      };
      if (parent) parent.children.push(g.id);
      groupById.set(g.id, g);
      ast.groups.push(g);
      groupStack.push(g);
      continue;
    }

    // ── device declaration (`<kind> id ["label"] attrs`) ──
    const canonKind = (KIND_ALIASES[t0.value] ?? t0.value) as DeviceKind;
    if (!t0.str && DEVICE_KINDS.has(canonKind)) {
      const idT = toks[1];
      if (!idT || idT.str) throw new NetworkParseError(`device "${t0.value}" needs an id (line ${lineNo})`);
      let idx = 2;
      let label: string | undefined;
      if (toks[2]?.str) { label = toks[2]!.value; idx = 3; }
      const d: NetworkDevice = { id: idT.value, kind: canonKind, label, groups: groupStack.map((g) => g.id) };
      applyAttrs(d, toks, idx, lineNo);
      addDevice(d, lineNo);
      continue;
    }

    // ── shorthand (`id id ... : kind attrs`) ──
    const sep = toks.findIndex((t) => !t.str && t.value === ":");
    if (sep > 0) {
      const ids = toks.slice(0, sep);
      const kindT = toks[sep + 1];
      if (kindT && !kindT.str && ids.every((t) => !t.str)) {
        const k = (KIND_ALIASES[kindT.value] ?? kindT.value) as DeviceKind;
        if (!DEVICE_KINDS.has(k)) {
          const hint = nearestKind(kindT.value);
          throw new NetworkParseError(
            `unknown device kind "${kindT.value}"${hint ? ` — did you mean "${hint}"?` : ""} (line ${lineNo})`,
          );
        }
        for (const idT of ids) {
          const d: NetworkDevice = { id: idT.value, kind: k, groups: groupStack.map((g) => g.id) };
          applyAttrs(d, toks, sep + 2, lineNo);
          addDevice(d, lineNo);
        }
        continue;
      }
    }

    // ── lone id inside a group → membership reference ──
    if (toks.length === 1 && !t0.str && groupStack.length > 0) {
      const top = groupStack[groupStack.length - 1]!;
      if (!top.members.includes(t0.value)) top.members.push(t0.value);
      continue;
    }

    // ── otherwise: looks like an attempted device decl with a bad kind ──
    if (!t0.str && toks.length >= 2 && !toks[1]!.str) {
      const hint = nearestKind(t0.value);
      throw new NetworkParseError(
        `unknown device kind "${t0.value}"${hint ? ` — did you mean "${hint}"?` : ""} (line ${lineNo})`,
      );
    }
    throw new NetworkParseError(`cannot parse line ${lineNo}: "${stmt.text.trim()}"`);
  }

  if (groupStack.length > 0) {
    throw new NetworkParseError(`unclosed group "${groupStack[groupStack.length - 1]!.id}"`);
  }

  // ── spine-leaf: auto-declare spine/leaf devices ──
  for (const id of ast.spines) ensureDevice(id, "l3switch");
  for (const id of ast.leaves) ensureDevice(id, "switch");

  // ── validation: link endpoints must be declared devices ──
  for (const link of ast.links) {
    for (const end of [link.from, link.to]) {
      if (!deviceById.has(end)) {
        throw new NetworkParseError(
          `link references undeclared device "${end}" (line ${link.line ?? "?"})`,
        );
      }
    }
    // trunk endpoints should be switch-class (soft warning)
    if (link.mode === "trunk") {
      const a = deviceById.get(link.from)!, b = deviceById.get(link.to)!;
      if (!SWITCH_CLASS.has(a.kind) && !SWITCH_CLASS.has(b.kind)) {
        ast.warnings.push(`trunk link ${link.from}–${link.to} connects no switch-class device (line ${link.line ?? "?"})`);
      }
    }
  }

  // ── subnet membership: device ip must fall inside the subnet CIDR ──
  for (const g of ast.groups) {
    if (g.kind !== "subnet" || !g.label) continue;
    for (const memberId of g.members) {
      const d = deviceById.get(memberId);
      if (!d?.ip) continue;
      const inside = ipInCidr(d.ip, g.label);
      if (inside === false) {
        throw new NetworkParseError(
          `${d.id} ip ${d.ip} is not inside subnet ${g.label} (line ${d.line ?? g.line ?? "?"})`,
        );
      }
    }
  }

  return ast;
}
