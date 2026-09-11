import { pointOnRoute } from "./routing";
/**
 * Network topology — SVG renderer.
 *
 * Spec: docs/reference/35-NETWORK-STANDARD.md §3, §6, §8.
 */
import { LABEL_GAP, edgeLabelObstacles, labelEdgeAnchor, labelLeader, placeLabel, type LabelBox } from "../../core/label-placement";
import { estimateTextWidth } from "../../core/text-metrics";

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
import { layoutNetwork, deviceCaption, deviceLabelLines, NET_CONST as C } from "./layout";
import { drawDeviceIcon, isCloudKind } from "./symbols";
import type { DeviceBox, GroupBox, LinkGeom, NetworkAst, NetworkLayoutResult, NetworkLink } from "./types";
import { resolveSceneTitle } from "../../core/title-scene";

type Theme = ResolvedTheme<NetworkTokens>;

// Two pixels above and below the font envelope include descenders and the text halo.
const LABEL_VERTICAL_PADDING = 4;

const r2 = (n: number) => Math.round(n * 100) / 100;

function buildCss(t: Theme): string {
  return `
.sx-net { font-family: Inter, "Helvetica Neue", sans-serif; }
.sx-net-body { fill: ${t.deviceFill}; stroke: ${t.deviceStroke}; stroke-width: 1.4; }
.sx-net-detail { fill: none; stroke: ${t.deviceStroke}; stroke-width: 1; }
.sx-net-glyph { fill: ${t.deviceAccent}; stroke: none; }
.sx-net-glyph-line { fill: none; stroke: ${t.deviceAccent}; stroke-width: 1.4; }
.sx-net-icontext { font: 700 8px Inter, "Helvetica Neue", sans-serif; fill: ${t.deviceAccent}; }
.sx-net-icontag { font: 700 8px Inter, "Helvetica Neue", sans-serif; fill: ${t.subLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 2.5px; stroke-linejoin: round; }
.sx-net-cloud-body { fill: ${t.cloudFill}; stroke: ${t.cloudStroke}; stroke-width: 1.4; }
.sx-net-cloudtext { font: 600 13px Inter, "Helvetica Neue", sans-serif; fill: ${t.text}; }
.sx-net-bus { stroke: ${t.deviceStroke}; stroke-width: 4; stroke-linecap: round; }
.sx-net-label { font: 12px Inter, "Helvetica Neue", sans-serif; fill: ${t.label}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 3px; stroke-linejoin: round; }
.sx-net-sublabel { font: 10px Inter, "Helvetica Neue", sans-serif; fill: ${t.subLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 3px; stroke-linejoin: round; }
.sx-net-link { fill: none; stroke-width: 1.4; }
.sx-net-link-wireless, .sx-net-link-vpn { stroke-dasharray: 5 4; }
.sx-net-link-lag { stroke-width: 3; }
.sx-net-linklabel { font: 9px Inter, "Helvetica Neue", sans-serif; fill: ${t.linkLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 3px; stroke-linejoin: round; }
.sx-net-port { font: 8px Inter, "Helvetica Neue", sans-serif; fill: ${t.linkLabel}; paint-order: stroke; stroke: ${t.bg}; stroke-width: 2.5px; stroke-linejoin: round; }
.sx-net-boundary-site { fill: none; stroke: ${t.siteStroke}; stroke-width: 1.5; }
.sx-net-boundary-rack { fill: none; stroke: ${t.siteStroke}; stroke-width: 1.5; stroke-dasharray: 1 2; }
.sx-net-boundary-subnet, .sx-net-boundary-vlan { fill: ${t.subnetFill}; stroke: ${t.subnetStroke}; stroke-width: 1.2; stroke-dasharray: 5 3; }
.sx-net-boundary-vlan { stroke-dasharray: none; }
.sx-net-boundary-zone, .sx-net-boundary-dmz { fill: none; stroke: ${t.zoneStroke}; stroke-width: 1.2; stroke-dasharray: 5 3; }
.sx-net-boundary-label { font: 600 10px Inter, "Helvetica Neue", sans-serif; }
.sx-net-title { font: 700 16px Inter, "Helvetica Neue", sans-serif; fill: ${t.text}; }
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

function renderLink(lg: LinkGeom, t: Theme, occupied: LabelBox[], boundaries: readonly GroupBox[], scene?: SceneItem[], index = 0, otherWires: readonly LabelBox[] = []): string {
  const { link } = lg;
  const color = linkColor(t, link);
  const cls = `sx-net-link sx-net-link-${link.linkType}`;
  const parts: string[] = [];

  if (link.linkType === "lag") {
    // Offset the complete routed polyline, including its bends.
    for(const offset of [-1.8,1.8]) {
      const points=lg.points.map((p,i)=>{
        const before=lg.points[Math.max(0,i-1)],after=lg.points[Math.min(lg.points.length-1,i+1)];
        const normal=(a:typeof p,b:typeof p)=>{const len=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:-(b.y-a.y)/len,y:(b.x-a.x)/len};};
        const n1=i?normal(before,p):normal(p,after),n2=i<lg.points.length-1?normal(p,after):n1;
        const divisor=Math.max(.5,1+n1.x*n2.x+n1.y*n2.y);
        return `${r2(p.x+offset*(n1.x+n2.x)/divisor)},${r2(p.y+offset*(n1.y+n2.y)/divisor)}`;
      });
      parts.push(el("polyline",{class:cls,stroke:color,points:points.join(" ")}));
    }
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

  if (link.directed) { const before=lg.points[lg.points.length-3],tip=lg.points[lg.points.length-2]; parts.push(arrowHead(before.x, before.y, tip.x, tip.y, color)); }

  // fiber slash ticks
  if (link.linkType === "fiber") {
    for (const f of [0.4, 0.55]) {
      const {point,previous,next}=pointOnRoute(lg.points,f);
      const ang=Math.atan2(next.y-previous.y,next.x-previous.x)+Math.PI/2;
      const mx=point.x,my=point.y;
      parts.push(line({ class: cls, stroke: color, x1: r2(mx - 3 * Math.cos(ang)), y1: r2(my - 3 * Math.sin(ang)), x2: r2(mx + 3 * Math.cos(ang)), y2: r2(my + 3 * Math.sin(ang)) }));
    }
  }

  // Use the same measured boxes for placement, painted labels and scene metadata.
  const place = (label: string, x: number, baseline: number, fontSize: number, cls: string, editable = false): LabelBox => {
    const size = { width: estimateTextWidth(label, fontSize), height: fontSize + LABEL_VERTICAL_PADDING };
    const anchor = labelEdgeAnchor({ x, y: baseline - fontSize / 2 }, lg.points).point;
    // A crossing link's label belongs to the innermost boundary at its anchor.
    const container = boundaries.find((g) => g.group.kind !== "vlan" && anchor.x >= g.x && anchor.x <= g.x + g.w &&
      anchor.y >= g.y && anchor.y <= g.y + g.h);
    // Reserve the title band as well as the boundary stroke and label gap.
    const bounds = container ? { x: container.x + LABEL_GAP + 1, y: container.y + 17 + LABEL_GAP,
      width: container.w - 2 * (LABEL_GAP + 1), height: container.h - 18 - 2 * LABEL_GAP } : undefined;
    // A label may sit on its own wire (the text halo makes a readable gap),
    // but must still clear other wires. Restrict container search to the local
    // channel: a boundary corner is not a meaningful annotation anchor.
    const local = bounds ? {
      x:Math.max(bounds.x,anchor.x-size.width/2-48),
      y:Math.max(bounds.y,anchor.y-size.height/2-32),
      width:0,height:0,
    } : undefined;
    if(local && bounds) {
      local.width=Math.max(size.width,Math.min(bounds.x+bounds.width,anchor.x+size.width/2+48)-local.x);
      local.height=Math.max(size.height,Math.min(bounds.y+bounds.height,anchor.y+size.height/2+32)-local.y);
    }
    const box = placeLabel(anchor, size, [...occupied,...otherWires], labelEdgeAnchor(anchor, lg.points).direction, local);
    occupied.push(box);
    const leader = labelLeader(box, lg.points);
    if (leader) {
      parts.push(line({ x1: leader.from.x, y1: leader.from.y, x2: leader.to.x, y2: leader.to.y, stroke: color, "stroke-width": 1 }));
      occupied.push(...edgeLabelObstacles([leader.from, leader.to]));
    }
    parts.push(textEl({
      class: cls, x: r2(box.x + box.width / 2), y: r2(box.y + box.height / 2 + fontSize / 2), "text-anchor": "middle",
      "data-sx-key": scene && editable ? `edge:${index}:label` : undefined,
      "data-sx-role": scene && editable ? "label" : undefined,
      "data-sx-live-midpoint": scene && cls === "sx-net-linklabel" ? "true" : undefined,
    }, label));
    return box;
  };
  const ann = annotation(link);
  const annotationBox = ann ? place(ann, lg.labelX, lg.labelY - 3, 9, "sx-net-linklabel", link.labelSourceRange !== undefined) : undefined;
  if (link.portNear) place(link.portNear, pointOnRoute(lg.points,0.16).point.x, pointOnRoute(lg.points,0.16).point.y - 3, 8, "sx-net-port");
  if (link.portFar) place(link.portFar, pointOnRoute(lg.points,0.84).point.x, pointOnRoute(lg.points,0.84).point.y - 3, 8, "sx-net-port");

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
        bbox: annotationBox,
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
        "data-sx-live-mode": lg.points.every((p, i) => i === 0 || p.x === lg.points[i - 1].x || p.y === lg.points[i - 1].y)
          ? "orthogonal" : "sampled",
      } : {}),
    },
    parts,
  );
}

// ── boundaries ───────────────────────────────────────────────────

function boundaryLabel(gb: GroupBox): string {
  const label = gb.group.label ?? gb.group.id;
  return gb.group.kind === "vlan" && !/^vlan\b/i.test(label.trimStart()) ? `VLAN ${label}` : label;
}

function renderGroup(gb: GroupBox, t: Theme): string {
  const k = gb.group.kind;
  const cls = `sx-net-boundary-${k}`;
  const labelColor =
    k === "zone" || k === "dmz" ? t.zoneStroke
      : k === "subnet" || k === "vlan" ? t.subnetStroke
        : t.siteStroke;
  const label = gb.group.label ?? gb.group.id;
  const tag = boundaryLabel(gb);
  return group(
    { class: "sx-net-boundary", "data-kind": k, "data-label": escapeXml(label) },
    [
      rect({ class: cls, x: r2(gb.x), y: r2(gb.y), width: r2(gb.w), height: r2(gb.h), rx: k === "vlan" ? 3 : 8, ry: k === "vlan" ? 3 : 8 }),
      textEl({ class: "sx-net-boundary-label", fill: labelColor, x: r2(gb.x + C.GROUP_LABEL_INSET), y: r2(gb.y + 13) }, tag),
    ],
  );
}

// ── devices ──────────────────────────────────────────────────────

function renderDevice(b: DeviceBox, t: Theme, scene?: SceneItem[]): string {
  const d = b.device;
  const parts: string[] = [drawDeviceIcon(d, { x: b.x, y: b.y, w: b.w, h: b.h })];

  if (!isCloudKind(d.kind)) {
    const caption=deviceCaption(b);
    const labelY = caption.baseline, labelX=caption.x+caption.width/2;
    const lines=deviceLabelLines(d);
    parts.push(...lines.map((label,i)=>textEl({
      class: "sx-net-label", x:r2(labelX),y:r2(labelY+i*C.LABEL_H),"text-anchor":"middle",
      "data-sx-role":scene&&d.labelSourceRange?"label":undefined,
    },label)));
    const sub = d.ip ?? d.model;
    if (sub) parts.push(textEl({ class: "sx-net-sublabel", x: r2(labelX), y: r2(labelY + (lines.length-1)*C.LABEL_H + C.SUBLABEL_H), "text-anchor": "middle" }, sub));
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

  const occupied: LabelBox[] = [
    ...layout.devices.flatMap((device) => {
      const boxes = [{ x: device.x, y: device.y, width: device.w, height: device.h }];
      if (!isCloudKind(device.device.kind)) {
        const caption=deviceCaption(device);
        boxes.push({x:caption.x,y:caption.y,width:caption.width,height:caption.height+LABEL_VERTICAL_PADDING});
      }
      return boxes;
    }),
    ...layout.groups.map((g) => ({ x: g.x + C.GROUP_LABEL_INSET, y: g.y + 3,
      width: estimateTextWidth(boundaryLabel(g), 10, { fontWeight: 600 }), height: 10 + LABEL_VERTICAL_PADDING })),
    ...layout.groups.flatMap((g) => [
      { x: g.x - 1, y: g.y - 1, width: g.w + 2, height: 2 },
      { x: g.x - 1, y: g.y + g.h - 1, width: g.w + 2, height: 2 },
      { x: g.x - 1, y: g.y - 1, width: 2, height: g.h + 2 },
      { x: g.x + g.w - 1, y: g.y - 1, width: 2, height: g.h + 2 },
    ]),
  ];

  const body: string[] = [];
  // boundaries behind, outermost first
  const sortedGroups = [...layout.groups].sort((a, b) => a.depth - b.depth);
  body.push(group({ class: "sx-net-boundaries" }, sortedGroups.map((g) => renderGroup(g, t))));
  const labelBoundaries = [...sortedGroups].reverse();
  body.push(group({ class: "sx-net-links" }, layout.links.map((l, i) => {
    const a=layout.devices.find(d=>d.device.id===l.link.from)!,b=layout.devices.find(d=>d.device.id===l.link.to)!;
    const visible={...l,points:[{x:a.cx,y:a.cy},...l.points,{x:b.cx,y:b.cy}]};
    return renderLink(visible, t, occupied, labelBoundaries, config?.__scene, i, layout.links.flatMap((other,j)=>j===i?[]:edgeLabelObstacles(other.points)));
  })));
  body.push(group({ class: "sx-net-devices" }, layout.devices.map((b) => renderDevice(b, t, config?.__scene))));

  children.push(titleBand ? group({ transform: `translate(0, ${titleBand})` }, body) : group({}, body));

  const left = Math.min(0, ...occupied.map((box) => box.x - C.PAD));
  const top = Math.min(0, ...occupied.map((box) => box.y - C.PAD));
  const width = Math.max(layout.width, ...occupied.map((box) => box.x + box.width + C.PAD)) - left;
  const height = Math.max(layout.height, ...occupied.map((box) => box.y + box.height + C.PAD)) - top + titleBand;
  return svgRoot(
    {
      class: "sx-net",
      role: "img",
      "aria-label": escapeXml(layout.title ?? "Network diagram"),
      width: r2(width),
      height: r2(height),
      viewBox: `${r2(left)} ${r2(top)} ${r2(width)} ${r2(height)}`,
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
