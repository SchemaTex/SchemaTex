/**
 * Network topology — SVG renderer.
 *
 * Spec: docs/reference/35-NETWORK-STANDARD.md §3, §6, §8.
 */

import type { RenderConfig, SceneItem } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  rect,
  line,
  polygon,
  text as textEl,
  title as titleEl,
  desc,
  escapeXml,
} from "../../core/svg";
import { resolveNetworkTheme, type NetworkTokens, type ResolvedTheme } from "../../core/theme";
import { parseNetwork } from "./parser";
import { layoutNetwork, NET_CONST as C } from "./layout";
import { drawDeviceIcon, isCloudKind } from "./symbols";
import type { DeviceBox, GroupBox, LinkGeom, NetworkAst, NetworkLayoutResult, NetworkLink } from "./types";
import { resolveSceneTitle } from "../../core/title-scene";

type Theme = ResolvedTheme<NetworkTokens>;

const r2 = (n: number) => Math.round(n * 100) / 100;

function buildCss(t: Theme): string {
  return `
.sx-net { font-family: system-ui, -apple-system, sans-serif; }
.sx-net-body { fill: ${t.deviceFill}; stroke: ${t.deviceStroke}; stroke-width: 2; }
.sx-net-detail { fill: none; stroke: ${t.deviceStroke}; stroke-width: 1; }
.sx-net-glyph { fill: ${t.deviceAccent}; stroke: none; }
.sx-net-glyph-line { fill: none; stroke: ${t.deviceAccent}; stroke-width: 1.4; }
.sx-net-icontext { font: 700 8px sans-serif; fill: ${t.deviceAccent}; }
.sx-net-icontag { font: 700 8px sans-serif; fill: ${t.subLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 2.5px; stroke-linejoin: round; }
.sx-net-cloud-body { fill: ${t.cloudFill}; stroke: ${t.cloudStroke}; stroke-width: 2; }
.sx-net-cloudtext { font: 600 13px sans-serif; fill: ${t.text}; }
.sx-net-bus { stroke: ${t.deviceStroke}; stroke-width: 4; stroke-linecap: round; }
.sx-net-label { font: 12px sans-serif; fill: ${t.label}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 3px; stroke-linejoin: round; }
.sx-net-sublabel { font: 10px sans-serif; fill: ${t.subLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 3px; stroke-linejoin: round; }
.sx-net-link { fill: none; stroke-width: 2; }
.sx-net-link-wireless, .sx-net-link-vpn { stroke-dasharray: 5 4; }
.sx-net-link-lag { stroke-width: 3; }
.sx-net-linklabel { font: 9px sans-serif; fill: ${t.linkLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 3px; stroke-linejoin: round; }
.sx-net-port { font: 8px sans-serif; fill: ${t.linkLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 2.5px; stroke-linejoin: round; }
.sx-net-boundary-site { fill: none; stroke: ${t.siteStroke}; stroke-width: 1.5; }
.sx-net-boundary-rack { fill: none; stroke: ${t.siteStroke}; stroke-width: 1.5; stroke-dasharray: 1 2; }
.sx-net-boundary-subnet, .sx-net-boundary-vlan { fill: ${t.subnetFill}; stroke: ${t.subnetStroke}; stroke-width: 1.2; stroke-dasharray: 5 3; }
.sx-net-boundary-zone, .sx-net-boundary-dmz { fill: none; stroke: ${t.zoneStroke}; stroke-width: 1.2; stroke-dasharray: 5 3; }
.sx-net-boundary-label { font: 600 10px sans-serif; }
.sx-net-title { font: 700 16px sans-serif; fill: ${t.text}; }
`.trim();
}

// ── link colour & class ──────────────────────────────────────────

function linkColor(t: Theme, link: NetworkLink): string {
  if (link.linkType === "copper" && link.vlans && link.vlans.length === 1) {
    const vid = link.vlans[0]!;
    // Tint by VLAN, but skip the reserved alarm-red (it means DMZ/zone, not "a VLAN").
    const pal = t.vlanPalette.filter((c) => c !== t.negative);
    const safe = pal.length ? pal : t.vlanPalette;
    return safe[vid % safe.length]!;
  }
  switch (link.linkType) {
    case "fiber": return t.linkFiber;
    case "wireless": return t.linkWireless;
    case "serial": return t.linkSerial;
    case "poe": return t.linkPoe;
    case "vpn": return t.linkVpn;
    case "lag": return t.linkLag;
    default: return t.linkCopper;
  }
}

function annotation(link: NetworkLink): string {
  const parts: string[] = [];
  if (link.mode) parts.push(link.mode === "trunk" ? "Trunk" : "Access");
  if (link.vlans?.length) parts.push(`VLAN ${link.vlans.join(",")}`);
  if (link.speed) parts.push(link.speed);
  if (link.linkType === "poe") parts.push("PoE");
  if (link.linkType === "vpn") parts.push("VPN");
  if (link.label) parts.push(link.label);
  return parts.join(" · ");
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, color: string, hs = 6): string {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + Math.PI - 0.45;
  const a2 = ang + Math.PI + 0.45;
  return polygon({
    fill: color,
    points: `${r2(x2)},${r2(y2)} ${r2(x2 + hs * Math.cos(a1))},${r2(y2 + hs * Math.sin(a1))} ${r2(x2 + hs * Math.cos(a2))},${r2(y2 + hs * Math.sin(a2))}`,
  });
}

function renderLink(lg: LinkGeom, t: Theme, scene?: SceneItem[], index = 0): string {
  const { link } = lg;
  const p1 = lg.points[0]!;
  const p2 = lg.points[lg.points.length - 1]!;
  const color = linkColor(t, link);
  const cls = `sx-net-link sx-net-link-${link.linkType}`;
  const parts: string[] = [];

  if (link.linkType === "lag") {
    // double line: two parallel offsets perpendicular to the run
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
    const ox = 1.8 * Math.cos(ang);
    const oy = 1.8 * Math.sin(ang);
    parts.push(line({ class: cls, stroke: color, x1: r2(p1.x + ox), y1: r2(p1.y + oy), x2: r2(p2.x + ox), y2: r2(p2.y + oy) }));
    parts.push(line({ class: cls, stroke: color, x1: r2(p1.x - ox), y1: r2(p1.y - oy), x2: r2(p2.x - ox), y2: r2(p2.y - oy) }));
  } else if (scene) {
    parts.push(el("path", {
      class: cls,
      stroke: color,
      fill: "none",
      d: lg.points.map((p, i) => `${i === 0 ? "M" : "L"}${r2(p.x)} ${r2(p.y)}`).join(" "),
      "data-sx-live-edge": "true",
    }));
  } else {
    parts.push(el("polyline", { class: cls, stroke: color, points: lg.points.map((p) => `${r2(p.x)},${r2(p.y)}`).join(" ") }));
  }

  if (link.directed) parts.push(arrowHead(p1.x, p1.y, p2.x, p2.y, color));

  // fiber slash ticks
  if (link.linkType === "fiber") {
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
    for (const f of [0.4, 0.55]) {
      const mx = p1.x + (p2.x - p1.x) * f;
      const my = p1.y + (p2.y - p1.y) * f;
      parts.push(line({ class: cls, stroke: color, x1: r2(mx - 3 * Math.cos(ang)), y1: r2(my - 3 * Math.sin(ang)), x2: r2(mx + 3 * Math.cos(ang)), y2: r2(my + 3 * Math.sin(ang)) }));
    }
  }

  // mid-link annotation
  const ann = annotation(link);
  if (ann) parts.push(textEl({
    class: "sx-net-linklabel", x: r2(lg.labelX), y: r2(lg.labelY - 3), "text-anchor": "middle",
    "data-sx-key": scene && link.labelSourceRange ? `edge:${index}:label` : undefined,
    "data-sx-role": scene && link.labelSourceRange ? "label" : undefined,
    "data-sx-live-midpoint": scene ? "true" : undefined,
  }, ann));

  // port labels near endpoints
  if (link.portNear) parts.push(textEl({ class: "sx-net-port", x: r2(p1.x + (p2.x - p1.x) * 0.16), y: r2(p1.y + (p2.y - p1.y) * 0.16 - 3), "text-anchor": "middle" }, link.portNear));
  if (link.portFar) parts.push(textEl({ class: "sx-net-port", x: r2(p2.x + (p1.x - p2.x) * 0.16), y: r2(p2.y + (p1.y - p2.y) * 0.16 - 3), "text-anchor": "middle" }, link.portFar));

  if (scene) {
    scene.push({
      key: `edge:${index}`,
      kind: "edge",
      path: lg.points.map((p, i) => `${i === 0 ? "M" : "L"}${r2(p.x)} ${r2(p.y)}`).join(" "),
      editable: { label: false, position: "none" },
    });
    if (link.label && link.labelSourceRange) {
      scene.push({
        key: `edge:${index}:label`, kind: "label", label: link.label,
        sourceRange: link.labelSourceRange,
        editable: { label: true, position: "none" },
      });
    }
  }
  return group(
    {
      class: "sx-net-link-g",
      "data-from": link.from,
      "data-to": link.to,
      "data-type": link.linkType,
      ...(link.vlans?.length ? { "data-vlan": link.vlans.join(",") } : {}),
      ...(link.speed ? { "data-speed": link.speed } : {}),
      ...(link.mode ? { "data-mode": link.mode } : {}),
      ...(scene ? {
        "data-sx-live-explicit": "true",
        "data-sx-live-start": link.from,
        "data-sx-live-end": link.to,
        "data-sx-live-mode": "orthogonal",
      } : {}),
    },
    parts,
  );
}

// ── boundaries ───────────────────────────────────────────────────

function renderGroup(gb: GroupBox, t: Theme): string {
  const k = gb.group.kind;
  const cls = `sx-net-boundary-${k}`;
  const labelColor =
    k === "zone" || k === "dmz" ? t.zoneStroke
      : k === "subnet" || k === "vlan" ? t.subnetStroke
        : t.siteStroke;
  const label = gb.group.label ?? gb.group.id;
  const tag = k === "vlan" ? `VLAN ${label}` : label;
  return group(
    { class: "sx-net-boundary", "data-kind": k, "data-label": escapeXml(label) },
    [
      rect({ class: cls, x: r2(gb.x), y: r2(gb.y), width: r2(gb.w), height: r2(gb.h), rx: 8, ry: 8 }),
      textEl({ class: "sx-net-boundary-label", fill: labelColor, x: r2(gb.x + C.GROUP_LABEL_INSET), y: r2(gb.y + 13) }, tag),
    ],
  );
}

// ── devices ──────────────────────────────────────────────────────

function renderDevice(b: DeviceBox, t: Theme, scene?: SceneItem[]): string {
  const d = b.device;
  const parts: string[] = [drawDeviceIcon(d, { x: b.x, y: b.y, w: b.w, h: b.h })];

  if (!isCloudKind(d.kind)) {
    const labelY = b.y + b.h + C.LABEL_GAP + 11;
    parts.push(textEl({
      class: "sx-net-label", x: r2(b.cx), y: r2(labelY), "text-anchor": "middle",
      "data-sx-role": scene && d.labelSourceRange ? "label" : undefined,
    }, d.label ?? d.id));
    const sub = d.ip ?? d.model;
    if (sub) parts.push(textEl({ class: "sx-net-sublabel", x: r2(b.cx), y: r2(labelY + C.SUBLABEL_H), "text-anchor": "middle" }, sub));
  }

  const attrs: Record<string, string | number | undefined> = {
    class: "sx-net-device",
    "data-id": d.id,
    "data-kind": d.kind,
    "data-sx-key": scene ? `node:${d.id}` : undefined,
    "data-sx-owner": scene ? `node:${d.id}` : undefined,
  };
  if (d.tier) attrs["data-tier"] = d.tier;
  if (d.ip) attrs["data-ip"] = d.ip;
  if (d.cameraType) attrs["data-type"] = d.cameraType;
  scene?.push({
    key: `node:${d.id}`,
    kind: "node",
    semanticId: d.id,
    label: d.label ?? d.id,
    sourceRange: d.labelSourceRange,
    bbox: { x: b.x, y: b.y, width: b.w, height: b.h },
    positionSource: d.at && d.atSourceRange
      ? { range: d.atSourceRange, x: d.at.x, y: d.at.y, unitsPerSvgX: 1, unitsPerSvgY: 1 }
      : undefined,
    editable: { label: d.labelSourceRange !== undefined, position: "free" },
  });
  void t;
  return group(attrs, parts);
}

// ── top level ────────────────────────────────────────────────────

export function renderNetworkLayout(layout: NetworkLayoutResult, config?: RenderConfig): string {
  const t = resolveNetworkTheme(config?.theme ?? "default");
  const children: string[] = [];

  const counts = new Map<string, number>();
  for (const b of layout.devices) counts.set(b.device.kind, (counts.get(b.device.kind) ?? 0) + 1);
  const linkTypes = new Map<string, number>();
  for (const l of layout.links) linkTypes.set(l.link.linkType, (linkTypes.get(l.link.linkType) ?? 0) + 1);

  const descParts = [
    `${layout.devices.length} devices, ${layout.links.length} links, ${layout.groups.length} boundaries.`,
    `Topology: ${layout.topologyClass}.`,
    linkTypes.size ? `Links: ${[...linkTypes].map(([k, n]) => `${n} ${k}`).join(", ")}.` : "",
    layout.warnings.length ? `Warnings: ${layout.warnings.join("; ")}.` : "",
  ].filter(Boolean);

  children.push(titleEl(`Network diagram${layout.title ? " — " + layout.title : ""}`));
  children.push(desc(descParts.join(" ")));
  children.push(el("style", {}, buildCss(t)));

  const titleBand = layout.title ? 30 : 0;
  if (layout.title) {
    const title = resolveSceneTitle(layout.title, layout.ast.titleSourceRange, layout.width / 2, 21, config);
    children.push(textEl({ x: r2(title.x), y: r2(title.y), class: "sx-net-title", "text-anchor": "middle", ...title.attrs }, layout.title));
  }

  const body: string[] = [];
  // boundaries behind, outermost first
  const sortedGroups = [...layout.groups].sort((a, b) => a.depth - b.depth);
  body.push(group({ class: "sx-net-boundaries" }, sortedGroups.map((g) => renderGroup(g, t))));
  body.push(group({ class: "sx-net-links" }, layout.links.map((l, i) => renderLink(l, t, config?.__scene, i))));
  body.push(group({ class: "sx-net-devices" }, layout.devices.map((b) => renderDevice(b, t, config?.__scene))));

  children.push(titleBand ? group({ transform: `translate(0, ${titleBand})` }, body) : group({}, body));

  const height = layout.height + titleBand;
  return svgRoot(
    {
      class: "sx-net",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "Network diagram"),
      width: r2(layout.width),
      height: r2(height),
      viewBox: `0 0 ${r2(layout.width)} ${r2(height)}`,
      "data-diagram-type": "network",
    },
    children,
  );
}

export function renderNetwork(textOrAst: string | NetworkAst, config?: RenderConfig): string {
  const ast = typeof textOrAst === "string" ? parseNetwork(textOrAst) : textOrAst;
  const layout = layoutNetwork(ast, config?.__pins);
  return renderNetworkLayout(layout, config);
}
