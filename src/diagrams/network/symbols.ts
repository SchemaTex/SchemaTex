/**
 * Network topology — device symbol catalog.
 *
 * Original line-art following the Cisco-convention silhouettes (§3, §10).
 * Each icon draws inside a box (x, y, w, h) using theme CSS classes only —
 * no inline styles (hard constraint #3). Per the EE-ICON-ROADMAP rule, this
 * catalog is local to the network diagram (no central Icon interface).
 */

import { group, rect, circle, line, path as pathEl, polygon, text as textEl } from "../../core/svg";
import { wrapTextToWidth, estimateTextWidth } from "../../core/text-metrics";
import type { DeviceKind, NetworkDevice } from "./types";

// CSS classes (defined by the renderer's <style> block):
const BODY = "sx-net-body";          // main icon body: deviceFill + deviceStroke
const DET = "sx-net-detail";         // stroke detail lines (deviceStroke), no fill
const GLY = "sx-net-glyph";          // filled glyph/arrow (deviceAccent)
const GLYL = "sx-net-glyph-line";    // stroked glyph (deviceAccent), no fill
const ITX = "sx-net-icontext";       // small text inside an icon (deviceAccent)
const ITAG = "sx-net-icontag";       // small badge outside the icon body (on page bg, haloed)
const CLOUD = "sx-net-cloud-body";   // cloud abstraction
const CTX = "sx-net-cloudtext";      // text inside a cloud

interface Box { x: number; y: number; w: number; h: number; }

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A line ending in a small filled arrowhead (head colour = GLY). */
function arrow(x1: number, y1: number, x2: number, y2: number, hs = 4): string {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + Math.PI - 0.5;
  const a2 = ang + Math.PI + 0.5;
  const p1x = r2(x2 + hs * Math.cos(a1)), p1y = r2(y2 + hs * Math.sin(a1));
  const p2x = r2(x2 + hs * Math.cos(a2)), p2y = r2(y2 + hs * Math.sin(a2));
  return (
    line({ class: GLYL, x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2) }) +
    polygon({ class: GLY, points: `${r2(x2)},${r2(y2)} ${p1x},${p1y} ${p2x},${p2y}` })
  );
}

// ─── Infrastructure ──────────────────────────────────────────────

function router(b: Box): string {
  const cx=b.x+b.w/2,cy=b.y+b.h/2,r=Math.min(b.w,b.h)*0.4;
  return group({},[
    circle({class:BODY,cx,cy,r}),
    arrow(cx-3,cy-4,cx-3,cy-r+5,3),
    arrow(cx+3,cy+4,cx+3,cy+r-5,3),
    arrow(cx-4,cy+3,cx-r+5,cy+3,3),
    arrow(cx+4,cy-3,cx+r-5,cy-3,3),
  ]);
}

/** Rack face, with port sockets; routing and powered variants keep distinct marks. */
function switchBox(b: Box, kind: "switch" | "l3switch" | "poeswitch"): string {
  const w=b.w*0.88,h=b.h*0.46,x=b.x+(b.w-w)/2,y=b.y+(b.h-h)/2;
  const parts=[rect({class:BODY,x,y,width:w,height:h,rx:2})];
  const count=kind==="switch"?6:4;
  for(let i=0;i<count;i++)parts.push(rect({class:GLY,x:x+6+i*7,y:y+h/2-2,width:4,height:5,rx:0.5}));
  if(kind==="l3switch") {
    parts.push(arrow(x+w-15,y+7,x+w-5,y+7,2.5),arrow(x+w-5,y+15,x+w-15,y+15,2.5));
  } else if(kind==="poeswitch") {
    parts.push(pathEl({class:GLY,d:`M ${x+w-9} ${y+4} l -5 8 h 4 l -2 7 7 -10 h -4 Z`}));
  }
  return group({},parts);
}

function firewall(b: Box): string {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rw = b.w * 0.78, rh = b.h * 0.62;
  const x = cx - rw / 2, y = cy - rh / 2;
  const parts: string[] = [rect({ class: BODY, x: r2(x), y: r2(y), width: r2(rw), height: r2(rh), rx: 2, ry: 2 })];
  const rows = 3;
  const rhh = rh / rows;
  for (let i = 1; i < rows; i++) parts.push(line({ class: DET, x1: r2(x), y1: r2(y + i * rhh), x2: r2(x + rw), y2: r2(y + i * rhh) }));
  // offset vertical mortar lines (brick courses)
  for (let i = 0; i < rows; i++) {
    const yy = y + i * rhh;
    const offset = i % 2 === 0 ? rw / 3 : rw / 6;
    for (let vx = x + offset; vx < x + rw - 2; vx += rw / 3) {
      parts.push(line({ class: DET, x1: r2(vx), y1: r2(yy), x2: r2(vx), y2: r2(yy + rhh) }));
    }
  }
  return group({}, parts);
}

function brickless(b: Box, glyph: string): string {
  // generic rounded box with a centered text glyph (loadbalancer, ids, proxy, modem fallback)
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rw = b.w * 0.78, rh = b.h * 0.6;
  const x = cx - rw / 2, y = cy - rh / 2;
  return group({}, [
    rect({ class: BODY, x: r2(x), y: r2(y), width: r2(rw), height: r2(rh), rx: 3, ry: 3 }),
    textEl({ class: ITX, x: r2(cx), y: r2(cy + 4), "text-anchor": "middle" }, glyph),
  ]);
}

function accessPoint(b: Box): string {
  const cx = b.x + b.w / 2, cy = b.y + b.h * 0.62;
  const rw = b.w * 0.5, rh = b.h * 0.34;
  const parts: string[] = [
    rect({ class: BODY, x: r2(cx - rw / 2), y: r2(cy - rh / 2), width: r2(rw), height: r2(rh), rx: rh / 2, ry: rh / 2 }),
  ];
  // radio arcs above
  for (let i = 1; i <= 2; i++) {
    const rr = i * b.w * 0.16;
    parts.push(pathEl({ class: GLYL, d: `M ${r2(cx - rr)} ${r2(cy - rh / 2 - 2)} A ${r2(rr)} ${r2(rr)} 0 0 1 ${r2(cx + rr)} ${r2(cy - rh / 2 - 2)}` }));
  }
  return group({}, parts);
}

// ─── Endpoints ───────────────────────────────────────────────────

function server(b: Box): string {
  const w=b.w*0.48,h=b.h*0.84,x=b.x+(b.w-w)/2,y=b.y+(b.h-h)/2;
  const parts=[rect({class:BODY,x,y,width:w,height:h,rx:2})];
  for(let i=0;i<3;i++) {
    const yy=y+5+i*10;
    parts.push(rect({class:DET,x:x+4,y:yy,width:w-8,height:7,rx:0.6}),
      circle({class:GLY,cx:x+w-8,cy:yy+3.5,r:1}),
      line({class:GLYL,x1:x+7,y1:yy+3.5,x2:x+w-13,y2:yy+3.5}));
  }
  return group({},parts);
}

function serverFarm(b: Box, d: NetworkDevice): string {
  const parts: string[] = [];
  const off = Math.min(6, b.w * 0.1);
  for (let i = 2; i >= 0; i--) {
    parts.push(server({ x: b.x + i * off, y: b.y - i * off * 0.5, w: b.w - 2 * off, h: b.h - off }));
  }
  if (d.count) parts.push(textEl({ class: ITAG, x: r2(b.x + b.w - 6), y: r2(b.y + b.h - 2), "text-anchor": "end" }, `×${d.count}`));
  return group({}, parts);
}

function pc(b: Box): string {
  const cx = b.x + b.w / 2;
  const sw = b.w * 0.7, sh = b.h * 0.52;
  const sx = cx - sw / 2, sy = b.y + b.h * 0.12;
  return group({}, [
    rect({ class: BODY, x: r2(sx), y: r2(sy), width: r2(sw), height: r2(sh), rx: 2, ry: 2 }),
    rect({ class: DET, x: r2(sx + 3), y: r2(sy + 3), width: r2(sw - 6), height: r2(sh - 6), rx: 1, ry: 1, fill: "none" }),
    line({ class: DET, x1: r2(cx), y1: r2(sy + sh), x2: r2(cx), y2: r2(sy + sh + b.h * 0.16) }),
    line({ class: DET, x1: r2(cx - sw * 0.28), y1: r2(b.y + b.h - 2), x2: r2(cx + sw * 0.28), y2: r2(b.y + b.h - 2) }),
  ]);
}

function laptop(b: Box): string {
  const cx = b.x + b.w / 2;
  const sw = b.w * 0.6, sh = b.h * 0.46;
  const sx = cx - sw / 2, sy = b.y + b.h * 0.16;
  return group({}, [
    rect({ class: BODY, x: r2(sx), y: r2(sy), width: r2(sw), height: r2(sh), rx: 2, ry: 2 }),
    polygon({ class: BODY, points: `${r2(sx - sw * 0.18)},${r2(sy + sh + b.h * 0.18)} ${r2(sx + sw + sw * 0.18)},${r2(sy + sh + b.h * 0.18)} ${r2(sx + sw)},${r2(sy + sh)} ${r2(sx)},${r2(sy + sh)}` }),
  ]);
}

function mobile(b: Box): string {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rw = b.w * 0.32, rh = b.h * 0.82;
  return group({}, [
    rect({ class: BODY, x: r2(cx - rw / 2), y: r2(cy - rh / 2), width: r2(rw), height: r2(rh), rx: 3, ry: 3 }),
    line({ class: DET, x1: r2(cx - rw * 0.2), y1: r2(cy + rh / 2 - 4), x2: r2(cx + rw * 0.2), y2: r2(cy + rh / 2 - 4) }),
  ]);
}

function ipphone(b: Box): string {
  const x=b.x+b.w*.2,y=b.y+b.h*.17,w=b.w*.6,h=b.h*.66;
  const parts=[rect({class:BODY,x,y,width:w,height:h,rx:3}),
    rect({class:BODY,x:x+4,y:y+3,width:7,height:h-6,rx:3}),
    rect({class:DET,x:x+15,y:y+5,width:w-20,height:8,rx:1})];
  for(let r=0;r<2;r++)for(let c=0;c<3;c++)parts.push(circle({class:GLY,cx:x+17+c*5,cy:y+19+r*5,r:1}));
  return group({},parts);
}

function printer(b: Box): string {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rw = b.w * 0.7, rh = b.h * 0.42;
  const x = cx - rw / 2, y = cy - rh * 0.1;
  return group({}, [
    rect({ class: DET, x: r2(x + rw * 0.18), y: r2(y - rh * 0.7), width: r2(rw * 0.64), height: r2(rh * 0.7), fill: "none" }),
    rect({ class: BODY, x: r2(x), y: r2(y), width: r2(rw), height: r2(rh), rx: 2, ry: 2 }),
    rect({ class: DET, x: r2(x + rw * 0.18), y: r2(y + rh - 2), width: r2(rw * 0.64), height: r2(rh * 0.5), fill: "none" }),
    circle({ class: GLY, cx: r2(x + rw - 7), cy: r2(y + rh / 2), r: 1.6 }),
  ]);
}

function storage(b: Box): string {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rw = b.w * 0.5, rh = b.h * 0.78;
  const x = cx - rw / 2, y = cy - rh / 2;
  const ry = rw * 0.18;
  const parts: string[] = [
    pathEl({ class: BODY, d: `M ${r2(x)} ${r2(y + ry)} A ${r2(rw / 2)} ${r2(ry)} 0 0 1 ${r2(x + rw)} ${r2(y + ry)} L ${r2(x + rw)} ${r2(y + rh - ry)} A ${r2(rw / 2)} ${r2(ry)} 0 0 1 ${r2(x)} ${r2(y + rh - ry)} Z` }),
    pathEl({ class: DET, fill: "none", d: `M ${r2(x)} ${r2(y + ry)} A ${r2(rw / 2)} ${r2(ry)} 0 0 0 ${r2(x + rw)} ${r2(y + ry)}` }),
  ];
  return group({}, parts);
}

// ─── CCTV / security ─────────────────────────────────────────────

function camera(b: Box, d: NetworkDevice): string {
  const t = d.cameraType ?? "fixed";
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (t === "dome" || t === "ptz" || t === "turret") {
    const r=b.w*.26,top=cy-r*.35;
    const parts=[pathEl({class:BODY,d:`M ${cx-r} ${top} A ${r} ${r} 0 0 0 ${cx+r} ${top} Z`}),
      rect({class:BODY,x:cx-r-3,y:top-4,width:r*2+6,height:5,rx:1}),
      circle({class:GLY,cx,cy:top+r*.4,r:r*.25})];
    if(t==="ptz")parts.push(pathEl({class:GLYL,d:`M ${cx-r-5} ${top+4} Q ${cx-r-10} ${top+r+5} ${cx} ${top+r+6} Q ${cx+r+10} ${top+r+5} ${cx+r+5} ${top+4}`,"stroke-dasharray":"3 3"}));
    if(t==="turret")parts.push(circle({class:DET,cx,cy:top+r*.4,r:r*.48}));
    return group({},parts);
  }
  if (t === "bullet") {
    const bw = b.w * 0.6, bh = b.h * 0.34;
    const x = cx - bw / 2, y = cy - bh / 2;
    return group({}, [
      rect({ class: BODY, x: r2(x), y: r2(y), width: r2(bw), height: r2(bh), rx: bh / 2, ry: bh / 2 }),
      circle({ class: GLY, cx: r2(x + bw - 4), cy: r2(cy), r: r2(bh * 0.28) }),
      line({ class: DET, x1: r2(cx), y1: r2(y + bh), x2: r2(cx), y2: r2(y + bh + b.h * 0.16) }),
    ]);
  }
  // fixed / turret: box body + lens
  const bw = b.w * 0.5, bh = b.h * 0.42;
  const x = cx - bw / 2, y = cy - bh / 2;
  return group({}, [
    rect({ class: BODY, x: r2(x), y: r2(y), width: r2(bw), height: r2(bh), rx: 2, ry: 2 }),
    circle({ class: GLY, cx: r2(cx), cy: r2(cy), r: r2(bh * 0.3) }),
  ]);
}

function recorder(b: Box, label: string): string {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rw = b.w * 0.82, rh = b.h * 0.46;
  const x = cx - rw / 2, y = cy - rh / 2;
  return group({}, [
    rect({ class: BODY, x: r2(x), y: r2(y), width: r2(rw), height: r2(rh), rx: 2, ry: 2 }),
    circle({ class: GLY, cx: r2(x + rw * 0.22), cy: r2(y + rh * 0.32), r: 2 }),
    circle({ class: GLY, cx: r2(x + rw * 0.4), cy: r2(y + rh * 0.32), r: 2 }),
    textEl({ class: ITX, x: r2(cx), y: r2(y + rh * 0.85), "text-anchor": "middle" }, label),
  ]);
}

function monitor(b: Box, grid: boolean): string {
  const cx = b.x + b.w / 2;
  const sw = b.w * 0.84, sh = b.h * 0.56;
  const sx = cx - sw / 2, sy = b.y + b.h * 0.1;
  const parts: string[] = [rect({ class: BODY, x: r2(sx), y: r2(sy), width: r2(sw), height: r2(sh), rx: 2, ry: 2 })];
  if (grid) {
    parts.push(line({ class: DET, x1: r2(cx), y1: r2(sy), x2: r2(cx), y2: r2(sy + sh) }));
    parts.push(line({ class: DET, x1: r2(sx), y1: r2(sy + sh / 2), x2: r2(sx + sw), y2: r2(sy + sh / 2) }));
  }
  parts.push(line({ class: DET, x1: r2(cx), y1: r2(sy + sh), x2: r2(cx), y2: r2(sy + sh + b.h * 0.14) }));
  parts.push(line({ class: DET, x1: r2(cx - sw * 0.2), y1: r2(b.y + b.h - 2), x2: r2(cx + sw * 0.2), y2: r2(b.y + b.h - 2) }));
  return group({}, parts);
}

// ─── Clouds ──────────────────────────────────────────────────────

export function cloudText(label: string): string[] { return wrapTextToWidth(label,13,150,{fontWeight:600}); }
export function cloudSize(label: string): {w:number;h:number} {
  const lines=cloudText(label);
  return {w:Math.max(110,...lines.map(l=>estimateTextWidth(l,13,{fontWeight:600})+40)),h:Math.max(64,lines.length*17+38)};
}
function cloud(b: Box, label: string): string {
  const x=(n:number)=>r2(b.x+n*b.w),y=(n:number)=>r2(b.y+n*b.h);
  const d=`M ${x(.18)} ${y(.88)} C ${x(-.02)} ${y(.88)} ${x(-.02)} ${y(.42)} ${x(.2)} ${y(.42)} `+
    `C ${x(.16)} ${y(.08)} ${x(.58)} ${y(.03)} ${x(.64)} ${y(.3)} `+
    `C ${x(.85)} ${y(.17)} ${x(.97)} ${y(.39)} ${x(.9)} ${y(.51)} `+
    `C ${x(1.07)} ${y(.58)} ${x(1)} ${y(.88)} ${x(.84)} ${y(.88)} Z`;
  const lines=cloudText(label),baseline=b.y+b.h*.59-(lines.length-1)*8.5+4;
  return group({},[pathEl({class:CLOUD,d}),...lines.map((l,i)=>textEl({class:CTX,x:b.x+b.w/2,y:baseline+i*17,"text-anchor":"middle"},l))]);
}

function busBar(b: Box): string {
  const y = b.y + b.h / 2;
  return line({ class: "sx-net-bus", x1: r2(b.x), y1: r2(y), x2: r2(b.x + b.w), y2: r2(y) });
}

// ─── Dispatch ────────────────────────────────────────────────────

/** Default icon box footprint per kind (clouds/lan are wider). */
export function iconSize(kind: DeviceKind): { w: number; h: number } {
  if (kind === "internet" || kind === "wan" || kind === "cloud" || kind === "pstn") return { w: 110, h: 64 };
  if (kind === "lan") return { w: 150, h: 24 };
  if (kind === "serverfarm") return { w: 74, h: 58 };
  return { w: 64, h: 48 };
}

export function drawDeviceIcon(d: NetworkDevice, b: Box): string {
  switch (d.kind) {
    case "router": return router(b);
    case "gateway": return group({}, [router(b), textEl({ class: ITAG, x: r2(b.x + b.w / 2), y: r2(b.y + b.h - 1), "text-anchor": "middle" }, "GW")]);
    case "vpngw": return group({}, [router(b), textEl({ class: ITAG, x: r2(b.x + b.w / 2), y: r2(b.y + b.h - 1), "text-anchor": "middle" }, "VPN")]);
    case "switch": return switchBox(b, "switch");
    case "l3switch": return switchBox(b, "l3switch");
    case "poeswitch": return switchBox(b, "poeswitch");
    case "firewall": return firewall(b);
    case "loadbalancer": return brickless(b, "LB");
    case "ids": return brickless(b, "IDS");
    case "proxy": return brickless(b, "PXY");
    case "modem": return brickless(b, "MDM");
    case "wlc": return brickless(b, "WLC");
    case "ap": return accessPoint(b);
    case "server": return server(b);
    case "serverfarm": return serverFarm(b, d);
    case "pc": return pc(b);
    case "laptop": return laptop(b);
    case "mobile": return mobile(b);
    case "ipphone": return ipphone(b);
    case "printer": return printer(b);
    case "storage": return storage(b);
    case "camera": return camera(b, d);
    case "nvr": return recorder(b, "NVR");
    case "dvr": return recorder(b, "DVR");
    case "encoder": return brickless(b, "ENC");
    case "monitor": return monitor(b, (d.icon === "videowall"));
    case "internet": return cloud(b, d.label ?? "Internet");
    case "wan": return cloud(b, d.label ?? "WAN");
    case "pstn": return cloud(b, d.label ?? "PSTN");
    case "cloud": return cloud(b, d.label ?? "Cloud");
    case "lan": return busBar(b);
    default: return brickless(b, "?");
  }
}

/** Kinds rendered as a cloud (label sits inside the shape, not below it). */
export function isCloudKind(kind: DeviceKind): boolean {
  return kind === "internet" || kind === "wan" || kind === "pstn" || kind === "cloud";
}
