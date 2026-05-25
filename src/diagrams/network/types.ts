/**
 * Network topology diagram — AST and layout types.
 *
 * Spec: docs/reference/35-NETWORK-STANDARD.md
 */

// ─── Enums ───────────────────────────────────────────────────────

export type NetworkLayoutMode =
  | "tiered"
  | "tree"
  | "star"
  | "ring"
  | "bus"
  | "mesh"
  | "spine-leaf"
  | "manual";

export type NetworkDirection = "tb" | "lr";

export type DeviceTier = "edge" | "core" | "distribution" | "access";

export type CameraType = "fixed" | "bullet" | "dome" | "ptz" | "turret";

/**
 * Device kinds (§2.1–2.4). The icon catalog in `symbols.ts` maps each to an
 * original line-art silhouette following the Cisco-convention vocabulary.
 */
export type DeviceKind =
  // L2 / L3 infrastructure
  | "router"
  | "switch"
  | "l3switch"
  | "firewall"
  | "loadbalancer"
  | "ap"
  | "wlc"
  | "gateway"
  | "modem"
  | "ids"
  | "proxy"
  | "vpngw"
  // endpoints / hosts
  | "server"
  | "serverfarm"
  | "pc"
  | "laptop"
  | "mobile"
  | "ipphone"
  | "printer"
  | "storage"
  // CCTV / physical security
  | "camera"
  | "nvr"
  | "dvr"
  | "poeswitch"
  | "encoder"
  | "monitor"
  // networks / clouds (multi-device abstractions)
  | "internet"
  | "wan"
  | "cloud"
  | "pstn"
  | "lan";

export type LinkType =
  | "copper"
  | "fiber"
  | "wireless"
  | "serial"
  | "poe"
  | "vpn"
  | "lag";

export type LinkMode = "trunk" | "access";

export type GroupKind =
  | "site"
  | "rack"
  | "subnet"
  | "vlan"
  | "zone"
  | "dmz";

/** Detected topology class reported in <desc>. */
export type TopologyClass =
  | "star"
  | "ring"
  | "bus"
  | "mesh"
  | "tree"
  | "hierarchical"
  | "spine-leaf"
  | "point-to-point"
  | "general";

// ─── AST ─────────────────────────────────────────────────────────

export interface NetworkDevice {
  id: string;
  kind: DeviceKind;
  /** Human label; falls back to id at render time. */
  label?: string;
  tier?: DeviceTier;
  /** Camera body style (camera kind only). */
  cameraType?: CameraType;
  /** Raw IP / CIDR text, e.g. "192.168.20.11" or "10.0.0.0/30". */
  ip?: string;
  model?: string;
  /** Stack/farm size (serverfarm, switch stack). */
  count?: number;
  /** Explicit icon override. */
  icon?: string;
  /** Manual placement (layout: manual). */
  at?: { x: number; y: number };
  /** Group ids this device belongs to (innermost last). */
  groups: string[];
  line?: number;
}

export interface NetworkLink {
  from: string;
  to: string;
  /** `->` directed (traffic/uplink direction); `--`/`==` undirected. */
  directed: boolean;
  linkType: LinkType;
  mode?: LinkMode;
  vlans?: number[];
  /** Speed token, e.g. "1G", "10G", "100M". */
  speed?: string;
  ip?: string;
  portNear?: string;
  portFar?: string;
  label?: string;
  /** True when synthesized by spine-leaf auto-mesh (not authored). */
  auto?: boolean;
  line?: number;
}

export interface NetworkGroup {
  id: string;
  kind: GroupKind;
  label?: string;
  /** Direct device-id members. */
  members: string[];
  /** Nested group ids. */
  children: string[];
  parent?: string;
  line?: number;
}

export interface NetworkAst {
  type: "network";
  title?: string;
  layout: NetworkLayoutMode;
  direction: NetworkDirection;
  /** spine-leaf only. */
  spines: string[];
  leaves: string[];
  devices: NetworkDevice[];
  links: NetworkLink[];
  groups: NetworkGroup[];
  /** Non-fatal validation warnings surfaced in <desc>. */
  warnings: string[];
  metadata?: Record<string, string>;
}

// ─── Layout result ───────────────────────────────────────────────

export interface NetPoint {
  x: number;
  y: number;
}

export interface DeviceBox {
  device: NetworkDevice;
  /** Top-left of the icon box. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Icon center. */
  cx: number;
  cy: number;
  /** Resolved tier band index (for data-tier / debugging). */
  band: number;
}

export interface LinkGeom {
  link: NetworkLink;
  /** Polyline points (straight = 2 points; routed = more). */
  points: NetPoint[];
  /** Mid-link annotation anchor. */
  labelX: number;
  labelY: number;
}

export interface GroupBox {
  group: NetworkGroup;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Nesting depth (0 = outermost) for stroke/inset scaling. */
  depth: number;
}

export interface NetworkLayoutResult {
  ast: NetworkAst;
  width: number;
  height: number;
  devices: DeviceBox[];
  links: LinkGeom[];
  groups: GroupBox[];
  topologyClass: TopologyClass;
  warnings: string[];
  title?: string;
}
