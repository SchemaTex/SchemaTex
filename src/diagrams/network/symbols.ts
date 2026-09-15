/**
 * Accepted network silhouettes, fitted to the engine's existing icon boxes.
 * Geometry follows visual-eval/symbols/network; artwork coordinates are mapped
 * numerically, never with SVG scale transforms. Stroke and text sizes belong to
 * the theme, independent of the artwork's coordinate system.
 */
import { group, rect, circle, line, el, path as pathEl, text as textEl } from "../../core/svg";
import { wrapTextToWidth, estimateTextWidth } from "../../core/text-metrics";
import type { DeviceKind, NetworkDevice } from "./types";

const BODY = "sx-net-body";
const BEZEL = "sx-net-body sx-net-bezel";
const PANEL = "sx-net-body sx-net-panel";
const SCREEN = "sx-net-body sx-net-screen";
const DET = "sx-net-detail";
const INK = "sx-net-detail sx-net-ink-line";
const PORT = "sx-net-glyph sx-net-port-solid";
const GLY = "sx-net-glyph";
const GLYL = "sx-net-glyph-line";
const ITX = "sx-net-icontext";
const ITAG = "sx-net-icontag";
const CLOUD = "sx-net-cloud-body";
const CTX = "sx-net-cloudtext";
interface Box { x: number; y: number; w: number; h: number; }
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Fit the visible silhouette, not the padded reference canvas. Leave room for
 * the engine's 1.4px outline, and preserve aspect ratio for round optics, ports
 * and upright enclosures. This never participates in layout or anchor sizing. */
function artwork(b: Box, left: number, top: number, width: number, height: number) {
  const factor = Math.min((b.w - 4) / width, (b.h - 4) / height);
  return {
    x: (n: number) => r2(b.x + b.w / 2 + (n - left - width / 2) * factor),
    y: (n: number) => r2(b.y + b.h / 2 + (n - top - height / 2) * factor),
    u: (n: number) => r2(n * factor),
  };
}

/** Server. */
function server(b: Box): string {
  const { x, y, u } = artwork(b, -31.25, -39.25, 62.5, 78.5);
  return group({}, [
    rect({ class: BODY, x: x(-30), y: y(-38), width: u(60), height: u(76), rx: u(3) }),
    rect({ class: PANEL, x: x(-21), y: y(-24), width: u(42), height: u(15) }),
    rect({ class: PANEL, x: x(-21), y: y(-1), width: u(42), height: u(15) }),
    circle({ class: GLY, cx: x(16), cy: y(-17), r: u(2.5) }),
    circle({ class: GLY, cx: x(16), cy: y(6), r: u(2.5) }),
    pathEl({ class: INK, d: `M ${x(-19)} ${y(27)} L ${x(6)} ${y(27)}` }),
  ]);
}

/** Desktop workstation. */
function pc(b: Box): string {
  const { x, y, u } = artwork(b, -46.25, -35.25, 92.5, 74.75);
  return group({}, [
    rect({ class: BODY, x: x(-45), y: y(-34), width: u(90), height: u(56), rx: u(3) }),
    rect({ class: SCREEN, x: x(-37), y: y(-26), width: u(74), height: u(40) }),
    pathEl({ class: INK, d: `M ${x(0)} ${y(22)} L ${x(0)} ${y(38)} M ${x(-25)} ${y(38)} L ${x(25)} ${y(38)}`, "stroke-linecap": "butt" }),
  ]);
}

/** Layer 2 switch. */
function switchBox(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PORT, x: x(-43), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(-23), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(-3), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(17), y: y(-5), width: u(12), height: u(12) }),
    circle({ class: GLY, cx: x(43), cy: y(1), r: u(4) }),
  ]);
}

/** Firewall. */
function firewall(b: Box): string {
  const { x, y, u } = artwork(b, -55.25, -31.25, 110.5, 62.5);
  return group({}, [
    rect({ class: BODY, x: x(-54), y: y(-30), width: u(108), height: u(60), rx: u(2) }),
    pathEl({ class: INK, d: `M ${x(-54)} ${y(-10)} L ${x(54)} ${y(-10)} M ${x(-54)} ${y(10)} L ${x(54)} ${y(10)} M ${x(-18)} ${y(-30)} L ${x(-18)} ${y(-10)} M ${x(18)} ${y(-30)} L ${x(18)} ${y(-10)} M ${x(-36)} ${y(-10)} L ${x(-36)} ${y(10)} M ${x(0)} ${y(-10)} L ${x(0)} ${y(10)} M ${x(36)} ${y(-10)} L ${x(36)} ${y(10)} M ${x(-18)} ${y(10)} L ${x(-18)} ${y(30)} M ${x(18)} ${y(10)} L ${x(18)} ${y(30)}`, "stroke-linecap": "butt" }),
  ]);
}

/** Router. */
function router(b: Box): string {
  const { x, y, u } = artwork(b, -43.25, -25.25, 86.5, 50.5);
  return group({}, [
    rect({ class: BODY, x: x(-42), y: y(-24), width: u(84), height: u(48), rx: u(24) }),
    pathEl({ class: INK, d: `M ${x(-27)} ${y(-13)} L ${x(-9)} ${y(-3)} M ${x(27)} ${y(13)} L ${x(9)} ${y(3)}` }),
    pathEl({ class: PORT, d: `M ${x(-9)} ${y(-3)} L ${x(-18.42)} ${y(-2.51)} L ${x(-13.57)} ${y(-11.26)} Z` }),
    pathEl({ class: PORT, d: `M ${x(9)} ${y(3)} L ${x(18.42)} ${y(2.51)} L ${x(13.57)} ${y(11.26)} Z` }),
    pathEl({ class: INK, d: `M ${x(-6)} ${y(4)} L ${x(-24)} ${y(13)} M ${x(6)} ${y(-4)} L ${x(24)} ${y(-13)}` }),
    pathEl({ class: GLY, d: `M ${x(-27)} ${y(14.5)} L ${x(-22.08)} ${y(6.45)} L ${x(-17.61)} ${y(15.39)} Z` }),
    pathEl({ class: GLY, d: `M ${x(27)} ${y(-14.5)} L ${x(22.08)} ${y(-6.45)} L ${x(17.61)} ${y(-15.39)} Z` }),
  ]);
}

/** Database server. */
function database(b: Box): string {
  const { x, y, u } = artwork(b, -33.25, -39.25, 66.5, 78.5);
  return group({}, [
    pathEl({ class: BODY, d: `M ${x(-32)} ${y(-28)} L ${x(-32)} ${y(28)} A ${u(32)} ${u(10)} 0 0 0 ${x(32)} ${y(28)} L ${x(32)} ${y(-28)}` }),
    el("ellipse", { class: PANEL, cx: x(0), cy: y(-28), rx: u(32), ry: u(10) }),
    pathEl({ class: DET, d: `M ${x(-32)} ${y(-8)} A ${u(32)} ${u(10)} 0 0 0 ${x(32)} ${y(-8)} M ${x(-32)} ${y(12)} A ${u(32)} ${u(10)} 0 0 0 ${x(32)} ${y(12)}` }),
    circle({ class: GLY, cx: x(20), cy: y(24), r: u(2.5) }),
  ]);
}

/** Layer 3 switch. */
function l3switch(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PORT, x: x(-43), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(-23), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(-3), y: y(-5), width: u(12), height: u(12) }),
    pathEl({ class: INK, d: `M ${x(20)} ${y(-7)} L ${x(44)} ${y(-7)} M ${x(39)} ${y(-12)} L ${x(44)} ${y(-7)} L ${x(39)} ${y(-2)} M ${x(44)} ${y(9)} L ${x(20)} ${y(9)} M ${x(25)} ${y(4)} L ${x(20)} ${y(9)} L ${x(25)} ${y(14)}` }),
    circle({ class: GLY, cx: x(-37), cy: y(-13), r: u(2.5) }),
  ]);
}

/** Wireless access point. */
function ap(b: Box): string {
  const { x, y, u } = artwork(b, -31.25, -33.25, 62.5, 59.5);
  return group({}, [
    rect({ class: BODY, x: x(-30), y: y(1), width: u(60), height: u(24), rx: u(12) }),
    pathEl({ class: INK, d: `M ${x(-14)} ${y(-5)} Q ${x(0)} ${y(-20)} ${x(14)} ${y(-5)}` }),
    pathEl({ class: GLYL, d: `M ${x(-25)} ${y(-12)} Q ${x(0)} ${y(-39)} ${x(25)} ${y(-12)}` }),
    pathEl({ class: DET, d: `M ${x(-9)} ${y(13)} L ${x(9)} ${y(13)}` }),
  ]);
}

/** Rack storage array. */
function storage(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PANEL, x: x(-44), y: y(-13), width: u(16), height: u(26) }),
    pathEl({ class: DET, d: `M ${x(-40)} ${y(6)} L ${x(-32)} ${y(6)}` }),
    rect({ class: PANEL, x: x(-22), y: y(-13), width: u(16), height: u(26) }),
    pathEl({ class: DET, d: `M ${x(-18)} ${y(6)} L ${x(-10)} ${y(6)}` }),
    rect({ class: PANEL, x: x(0), y: y(-13), width: u(16), height: u(26) }),
    pathEl({ class: DET, d: `M ${x(4)} ${y(6)} L ${x(12)} ${y(6)}` }),
    rect({ class: PANEL, x: x(22), y: y(-13), width: u(16), height: u(26) }),
    pathEl({ class: DET, d: `M ${x(26)} ${y(6)} L ${x(34)} ${y(6)}` }),
    circle({ class: GLY, cx: x(48), cy: y(0), r: u(2.5) }),
  ]);
}

/** Laptop. */
function laptop(b: Box): string {
  const { x, y, u } = artwork(b, -46.25, -31.25, 92.5, 61.5);
  return group({}, [
    rect({ class: BODY, x: x(-35), y: y(-30), width: u(70), height: u(43), rx: u(3) }),
    rect({ class: SCREEN, x: x(-29), y: y(-24), width: u(58), height: u(31) }),
    pathEl({ class: BODY, d: `M ${x(-35)} ${y(13)} L ${x(35)} ${y(13)} L ${x(45)} ${y(29)} L ${x(-45)} ${y(29)} Z` }),
    pathEl({ class: DET, d: `M ${x(-27)} ${y(18)} L ${x(27)} ${y(18)}` }),
    rect({ class: PANEL, x: x(-10), y: y(22), width: u(20), height: u(4) }),
  ]);
}

/** Fixed box camera. */
function cameraFixed(b: Box): string {
  const { x, y, u } = artwork(b, -36.25, -22.25, 72.5, 55.5);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(-8)} ${y(12)} L ${x(-8)} ${y(28)} L ${x(-27)} ${y(28)} M ${x(-27)} ${y(24)} L ${x(-27)} ${y(32)}` }),
    rect({ class: BODY, x: x(17), y: y(-12), width: u(18), height: u(22), rx: u(1) }),
    rect({ class: PANEL, x: x(27), y: y(-7), width: u(5), height: u(12) }),
    rect({ class: BODY, x: x(-35), y: y(-21), width: u(52), height: u(36), rx: u(3) }),
    pathEl({ class: DET, d: `M ${x(-26)} ${y(-11)} L ${x(-13)} ${y(-11)}` }),
  ]);
}

/** Bullet camera. */
function cameraBullet(b: Box): string {
  const { x, y } = artwork(b, -38.25, -29.5416, 83.1286, 63.7916);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(-10)} ${y(9)} L ${x(-21)} ${y(26)} L ${x(-37)} ${y(26)} M ${x(-37)} ${y(18)} L ${x(-37)} ${y(33)}` }),
    pathEl({ class: BODY, d: `M ${x(-15.3369)} ${y(-20.7552)} L ${x(22.7053)} ${y(-8.3945)} C ${x(29.5336)} ${y(-6.1759)} ${x(33.2705)} ${y(1.1581)} ${x(31.0518)} ${y(7.9864)} L ${x(30.4338)} ${y(9.8885)} C ${x(28.2152)} ${y(16.7168)} ${x(20.8812)} ${y(20.4537)} ${x(14.0529)} ${y(18.2351)} L ${x(-23.9894)} ${y(5.8744)} C ${x(-30.8177)} ${y(3.6557)} ${x(-34.5546)} ${y(-3.6783)} ${x(-32.3359)} ${y(-10.5066)} L ${x(-31.7179)} ${y(-12.4087)} C ${x(-29.4992)} ${y(-19.237)} ${x(-22.1652)} ${y(-22.9739)} ${x(-15.3369)} ${y(-20.7552)} Z` }),
    pathEl({ class: PANEL, d: `M ${x(32.6449)} ${y(9.5555)} C ${x(30.4263)} ${y(16.3838)} ${x(25.2213)} ${y(20.8124)} ${x(21.0193)} ${y(19.4471)} C ${x(16.8172)} ${y(18.0818)} ${x(15.2094)} ${y(11.4396)} ${x(17.428)} ${y(4.6112)} C ${x(19.6467)} ${y(-2.2171)} ${x(24.8517)} ${y(-6.6457)} ${x(29.0537)} ${y(-5.2803)} C ${x(33.2557)} ${y(-3.915)} ${x(34.8636)} ${y(2.7272)} ${x(32.6449)} ${y(9.5555)} Z` }),
    pathEl({ class: PORT, d: `M ${x(28.8407)} ${y(8.3195)} C ${x(27.6461)} ${y(11.9962)} ${x(25.4002)} ${y(14.5618)} ${x(23.8244)} ${y(14.0498)} C ${x(22.2487)} ${y(13.5378)} ${x(21.9397)} ${y(10.1421)} ${x(23.1344)} ${y(6.4654)} C ${x(24.329)} ${y(2.7886)} ${x(26.5749)} ${y(0.223)} ${x(28.1507)} ${y(0.735)} C ${x(29.7264)} ${y(1.247)} ${x(30.0354)} ${y(4.6427)} ${x(28.8407)} ${y(8.3195)} Z` }),
    pathEl({ class: INK, d: `M ${x(-22.3514)} ${y(-28.2916)} L ${x(42.3205)} ${y(-7.2785)} L ${x(43.6286)} ${y(-1.5962)}` }),
  ]);
}

/** Dome camera. */
function cameraDome(b: Box): string {
  const { x, y, u } = artwork(b, -35.25, -21.25, 70.5, 43);
  return group({}, [
    pathEl({ class: PANEL, d: `M ${x(-29)} ${y(-8)} L ${x(29)} ${y(-8)} C ${x(29)} ${y(30)} ${x(-29)} ${y(30)} ${x(-29)} ${y(-8)} Z` }),
    el("ellipse", { class: BEZEL, cx: x(0), cy: y(5), rx: u(9), ry: u(9) }),
    el("ellipse", { class: PORT, cx: x(0), cy: y(5), rx: u(4), ry: u(4) }),
    rect({ class: BODY, x: x(-34), y: y(-20), width: u(68), height: u(12), rx: u(3) }),
  ]);
}

/** Pan-tilt-zoom camera. */
function cameraPtz(b: Box): string {
  const { x, y, u } = artwork(b, -39.25, -40.25, 63.5, 76.5);
  return group({}, [
    rect({ class: BODY, x: x(-38), y: y(-39), width: u(8), height: u(25), rx: u(1) }),
    pathEl({ class: BODY, d: `M ${x(-30)} ${y(-35)} L ${x(7)} ${y(-35)} L ${x(7)} ${y(-17)} L ${x(-1)} ${y(-17)} L ${x(-1)} ${y(-27)} L ${x(-30)} ${y(-27)} Z` }),
    rect({ class: BODY, x: x(-17), y: y(-17), width: u(40), height: u(24), rx: u(7) }),
    pathEl({ class: PANEL, d: `M ${x(-17)} ${y(7)} L ${x(23)} ${y(7)} L ${x(23)} ${y(14)} C ${x(23)} ${y(42)} ${x(-17)} ${y(42)} ${x(-17)} ${y(14)} Z` }),
    el("ellipse", { class: BEZEL, cx: x(3), cy: y(20), rx: u(8), ry: u(8) }),
    el("ellipse", { class: PORT, cx: x(3), cy: y(20), rx: u(3), ry: u(3) }),
  ]);
}

/** Turret camera. */
function cameraTurret(b: Box): string {
  const { x, y, u } = artwork(b, -32.25, -27.25, 64.5, 55.5);
  return group({}, [
    rect({ class: BODY, x: x(-31), y: y(-26), width: u(62), height: u(10), rx: u(3) }),
    pathEl({ class: PANEL, d: `M ${x(-26)} ${y(-16)} L ${x(26)} ${y(-16)} L ${x(21)} ${y(9)} L ${x(-21)} ${y(9)} Z` }),
    el("ellipse", { class: BODY, cx: x(3), cy: y(6), rx: u(20), ry: u(21) }),
    el("ellipse", { class: PANEL, cx: x(10), cy: y(11), rx: u(10), ry: u(11) }),
    el("ellipse", { class: PORT, cx: x(12), cy: y(12), rx: u(4), ry: u(5) }),
  ]);
}

/** Network printer. */
function printer(b: Box): string {
  const { x, y, u } = artwork(b, -39.25, -38.25, 78.5, 78.5);
  return group({}, [
    rect({ class: BODY, x: x(-24), y: y(-37), width: u(48), height: u(29), rx: u(1) }),
    pathEl({ class: DET, d: `M ${x(-16)} ${y(-28)} L ${x(16)} ${y(-28)} M ${x(-16)} ${y(-21)} L ${x(11)} ${y(-21)}` }),
    rect({ class: BODY, x: x(-38), y: y(-12), width: u(76), height: u(43), rx: u(3) }),
    rect({ class: PANEL, x: x(-27), y: y(8), width: u(54), height: u(13) }),
    rect({ class: BODY, x: x(-23), y: y(13), width: u(46), height: u(26), rx: u(1) }),
    pathEl({ class: DET, d: `M ${x(-15)} ${y(22)} L ${x(15)} ${y(22)} M ${x(-15)} ${y(29)} L ${x(8)} ${y(29)}` }),
    circle({ class: GLY, cx: x(27), cy: y(-2), r: u(2.5) }),
  ]);
}

/** IP desk phone. */
function ipphone(b: Box): string {
  const { x, y, u } = artwork(b, -36.25, -29.25, 72.5, 59.5);
  return group({}, [
    pathEl({ class: BODY, d: `M ${x(-25)} ${y(-28)} L ${x(28)} ${y(-28)} L ${x(35)} ${y(29)} L ${x(-35)} ${y(29)} Z` }),
    rect({ class: PANEL, x: x(-3), y: y(-19), width: u(24), height: u(14) }),
    pathEl({ class: PANEL, d: `M ${x(-19)} ${y(-23)} L ${x(-11)} ${y(-23)} Q ${x(-9)} ${y(-23)} ${x(-9)} ${y(-21)} L ${x(-9)} ${y(-13)} L ${x(-14)} ${y(-9)} Q ${x(-17)} ${y(-4)} ${x(-14)} ${y(1)} L ${x(-9)} ${y(5)} L ${x(-9)} ${y(13)} Q ${x(-9)} ${y(15)} ${x(-11)} ${y(15)} L ${x(-19)} ${y(15)} C ${x(-27)} ${y(7)} ${x(-27)} ${y(-15)} ${x(-19)} ${y(-23)} Z` }),
    rect({ class: PORT, x: x(2), y: y(3), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(11), y: y(3), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(20), y: y(3), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(2), y: y(13), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(11), y: y(13), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(20), y: y(13), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(2), y: y(23), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(11), y: y(23), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(20), y: y(23), width: u(4), height: u(4) }),
  ]);
}

/** Network gateway. */
function gateway(b: Box): string {
  const { x, y, u } = artwork(b, -43.25, -25.25, 86.5, 50.5);
  return group({}, [
    rect({ class: BODY, x: x(-42), y: y(-24), width: u(84), height: u(48), rx: u(24) }),
    textEl({ class: ITX, x: x(0), y: y(7), "text-anchor": "middle" }, "GW"),
    pathEl({ class: INK, d: `M ${x(-32)} ${y(0)} L ${x(-23)} ${y(0)} M ${x(-27)} ${y(-4)} L ${x(-23)} ${y(0)} L ${x(-27)} ${y(4)} M ${x(23)} ${y(0)} L ${x(32)} ${y(0)} M ${x(28)} ${y(-4)} L ${x(32)} ${y(0)} L ${x(28)} ${y(4)}` }),
    circle({ class: GLY, cx: x(0), cy: y(16), r: u(2.5) }),
  ]);
}

/** Power-over-Ethernet switch. */
function poeswitch(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PORT, x: x(-43), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(-23), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(-3), y: y(-5), width: u(12), height: u(12) }),
    textEl({ class: ITX, x: x(33), y: y(5), "text-anchor": "middle" }, "PoE"),
    circle({ class: GLY, cx: x(33), cy: y(13), r: u(2.5) }),
  ]);
}

/** Load balancer. */
function loadbalancer(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PORT, x: x(-44), y: y(-5), width: u(10), height: u(10) }),
    pathEl({ class: INK, d: `M ${x(-29)} ${y(0)} L ${x(-9)} ${y(0)} M ${x(-9)} ${y(-12)} L ${x(-9)} ${y(12)} M ${x(-9)} ${y(-12)} L ${x(32)} ${y(-12)} M ${x(-9)} ${y(0)} L ${x(32)} ${y(0)} M ${x(-9)} ${y(12)} L ${x(32)} ${y(12)} M ${x(28)} ${y(-16)} L ${x(32)} ${y(-12)} L ${x(28)} ${y(-8)} M ${x(28)} ${y(-4)} L ${x(32)} ${y(0)} L ${x(28)} ${y(4)} M ${x(28)} ${y(8)} L ${x(32)} ${y(12)} L ${x(28)} ${y(16)}` }),
    circle({ class: GLY, cx: x(45), cy: y(0), r: u(2.5) }),
  ]);
}

/** Security monitor. */
function monitor(b: Box): string {
  const { x, y, u } = artwork(b, -46.25, -35.25, 92.5, 74.5);
  return group({}, [
    pathEl({ class: BODY, d: `M ${x(-7)} ${y(22)} L ${x(7)} ${y(22)} L ${x(7)} ${y(33)} L ${x(25)} ${y(38)} L ${x(-25)} ${y(38)} L ${x(-7)} ${y(33)} Z` }),
    rect({ class: BODY, x: x(-45), y: y(-34), width: u(90), height: u(56), rx: u(3) }),
    rect({ class: SCREEN, x: x(-37), y: y(-26), width: u(34), height: u(16) }),
    rect({ class: SCREEN, x: x(-37), y: y(-4), width: u(34), height: u(16) }),
    rect({ class: SCREEN, x: x(3), y: y(-26), width: u(34), height: u(16) }),
    rect({ class: SCREEN, x: x(3), y: y(-4), width: u(34), height: u(16) }),
  ]);
}

/** Network video recorder. */
function nvr(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    el("ellipse", { class: PANEL, cx: x(-34), cy: y(0), rx: u(12), ry: u(12) }),
    el("ellipse", { class: PORT, cx: x(-34), cy: y(0), rx: u(3), ry: u(3) }),
    textEl({ class: ITX, x: x(4), y: y(5), "text-anchor": "middle" }, "NVR"),
    rect({ class: PORT, x: x(35), y: y(-5), width: u(10), height: u(10) }),
    circle({ class: GLY, cx: x(41), cy: y(13), r: u(2.5) }),
  ]);
}

/** Mobile phone. */
function mobile(b: Box): string {
  const { x, y, u } = artwork(b, -16.25, -28.25, 32.5, 56.5);
  return group({}, [
    rect({ class: BODY, x: x(-15), y: y(-27), width: u(30), height: u(54), rx: u(5) }),
    rect({ class: SCREEN, x: x(-10), y: y(-17), width: u(20), height: u(33) }),
    pathEl({ class: DET, d: `M ${x(-4)} ${y(-22)} L ${x(4)} ${y(-22)} M ${x(-4)} ${y(22)} L ${x(4)} ${y(22)}` }),
  ]);
}

/** VPN gateway. */
function vpngw(b: Box): string {
  const { x, y, u } = artwork(b, -43.25, -25.25, 86.5, 50.5);
  return group({}, [
    rect({ class: BODY, x: x(-42), y: y(-24), width: u(84), height: u(48), rx: u(24) }),
    pathEl({ class: INK, d: `M ${x(-32)} ${y(0)} L ${x(-18)} ${y(0)} M ${x(18)} ${y(0)} L ${x(32)} ${y(0)}` }),
    pathEl({ class: INK, d: `M ${x(-6)} ${y(-2)} L ${x(-6)} ${y(-7)} A ${u(6)} ${u(6)} 0 0 1 ${x(6)} ${y(-7)} L ${x(6)} ${y(-2)}` }),
    rect({ class: BODY, x: x(-10), y: y(-2), width: u(20), height: u(17), rx: u(2) }),
    pathEl({ class: DET, d: `M ${x(0)} ${y(4)} L ${x(0)} ${y(9)}` }),
    circle({ class: GLY, cx: x(29), cy: y(9), r: u(2.5) }),
  ]);
}

/** Server farm. */
function serverfarm(b: Box): string {
  const { x, y, u } = artwork(b, -55.25, -51.25, 110.5, 102.5);
  return group({}, [
    rect({ class: BODY, x: x(-6), y: y(-50), width: u(60), height: u(76), rx: u(3) }),
    rect({ class: PANEL, x: x(3), y: y(-36), width: u(42), height: u(15) }),
    rect({ class: PANEL, x: x(3), y: y(-13), width: u(42), height: u(15) }),
    pathEl({ class: INK, d: `M ${x(5)} ${y(15)} L ${x(30)} ${y(15)}` }),
    rect({ class: BODY, x: x(-30), y: y(-38), width: u(60), height: u(76), rx: u(3) }),
    rect({ class: PANEL, x: x(-21), y: y(-24), width: u(42), height: u(15) }),
    rect({ class: PANEL, x: x(-21), y: y(-1), width: u(42), height: u(15) }),
    pathEl({ class: INK, d: `M ${x(-19)} ${y(27)} L ${x(6)} ${y(27)}` }),
    rect({ class: BODY, x: x(-54), y: y(-26), width: u(60), height: u(76), rx: u(3) }),
    rect({ class: PANEL, x: x(-45), y: y(-12), width: u(42), height: u(15) }),
    rect({ class: PANEL, x: x(-45), y: y(11), width: u(42), height: u(15) }),
    pathEl({ class: INK, d: `M ${x(-43)} ${y(39)} L ${x(-18)} ${y(39)}` }),
    circle({ class: GLY, cx: x(-8), cy: y(18), r: u(2.5) }),
  ]);
}

/** Modem. */
function modem(b: Box): string {
  const { x, y, u } = artwork(b, -25.25, -35.25, 50.5, 70.5);
  return group({}, [
    rect({ class: BODY, x: x(-24), y: y(26), width: u(48), height: u(8), rx: u(2) }),
    rect({ class: BODY, x: x(-18), y: y(-34), width: u(36), height: u(60), rx: u(4) }),
    pathEl({ class: INK, d: `M ${x(-11)} ${y(-7)} Q ${x(-6)} ${y(-21)} ${x(0)} ${y(-7)} T ${x(11)} ${y(-7)}` }),
    rect({ class: PORT, x: x(-5), y: y(12), width: u(10), height: u(10) }),
    circle({ class: GLY, cx: x(0), cy: y(3), r: u(2.5) }),
  ]);
}

/** Wireless LAN controller. */
function wlc(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PORT, x: x(-43), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PORT, x: x(-23), y: y(-5), width: u(12), height: u(12) }),
    rect({ class: PANEL, x: x(10), y: y(3), width: u(30), height: u(10) }),
    pathEl({ class: INK, d: `M ${x(16)} ${y(-1)} Q ${x(25)} ${y(-11)} ${x(34)} ${y(-1)}` }),
    pathEl({ class: GLYL, d: `M ${x(9)} ${y(-7)} Q ${x(25)} ${y(-24)} ${x(41)} ${y(-7)}` }),
  ]);
}

/** Intrusion detection appliance. */
function ids(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    pathEl({ class: PANEL, d: `M ${x(-17)} ${y(-14)} L ${x(0)} ${y(-18)} L ${x(17)} ${y(-14)} L ${x(17)} ${y(0)} Q ${x(17)} ${y(10)} ${x(0)} ${y(17)} Q ${x(-17)} ${y(10)} ${x(-17)} ${y(0)} Z` }),
    pathEl({ class: DET, d: `M ${x(-10)} ${y(-2)} Q ${x(0)} ${y(-12)} ${x(10)} ${y(-2)} Q ${x(0)} ${y(8)} ${x(-10)} ${y(-2)} Z` }),
    el("ellipse", { class: PORT, cx: x(0), cy: y(-2), rx: u(3), ry: u(3) }),
    rect({ class: PORT, x: x(-43), y: y(-5), width: u(10), height: u(10) }),
    circle({ class: GLY, cx: x(42), cy: y(0), r: u(2.5) }),
  ]);
}

/** Proxy appliance. */
function proxy(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PANEL, x: x(-9), y: y(-15), width: u(18), height: u(30) }),
    pathEl({ class: INK, d: `M ${x(-39)} ${y(-6)} L ${x(37)} ${y(-6)} M ${x(31)} ${y(-12)} L ${x(37)} ${y(-6)} L ${x(31)} ${y(0)} M ${x(39)} ${y(7)} L ${x(-37)} ${y(7)} M ${x(-31)} ${y(1)} L ${x(-37)} ${y(7)} L ${x(-31)} ${y(13)}` }),
    circle({ class: GLY, cx: x(46), cy: y(0), r: u(2.5) }),
  ]);
}

/** Digital video recorder. */
function dvr(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    el("ellipse", { class: PANEL, cx: x(-34), cy: y(0), rx: u(12), ry: u(12) }),
    el("ellipse", { class: PORT, cx: x(-34), cy: y(0), rx: u(3), ry: u(3) }),
    textEl({ class: ITX, x: x(4), y: y(5), "text-anchor": "middle" }, "DVR"),
    el("ellipse", { class: BEZEL, cx: x(34), cy: y(0), rx: u(4), ry: u(4) }),
    el("ellipse", { class: BEZEL, cx: x(46), cy: y(0), rx: u(4), ry: u(4) }),
    circle({ class: GLY, cx: x(40), cy: y(13), r: u(2.5) }),
  ]);
}

/** Video encoder. */
function encoder(b: Box): string {
  const { x, y, u } = artwork(b, -36.25, -21.25, 72.5, 42.5);
  return group({}, [
    rect({ class: BODY, x: x(-35), y: y(-20), width: u(70), height: u(40), rx: u(3) }),
    el("ellipse", { class: BEZEL, cx: x(-23), cy: y(0), rx: u(5), ry: u(5) }),
    pathEl({ class: PANEL, d: `M ${x(-8)} ${y(-10)} L ${x(9)} ${y(0)} L ${x(-8)} ${y(10)} Z` }),
    rect({ class: PORT, x: x(20), y: y(-5), width: u(10), height: u(10) }),
    circle({ class: GLY, cx: x(25), cy: y(12), r: u(2.5) }),
  ]);
}

/** Hypervisor host. */
function hypervisor(b: Box): string {
  const { x, y, u } = artwork(b, -31.25, -39.25, 62.5, 78.5);
  return group({}, [
    rect({ class: BODY, x: x(-30), y: y(-38), width: u(60), height: u(76), rx: u(3) }),
    rect({ class: PANEL, x: x(-8), y: y(-29), width: u(28), height: u(20) }),
    rect({ class: PANEL, x: x(-14), y: y(-22), width: u(28), height: u(20) }),
    rect({ class: PANEL, x: x(-20), y: y(-15), width: u(28), height: u(20) }),
    rect({ class: PANEL, x: x(-21), y: y(17), width: u(42), height: u(13) }),
    circle({ class: GLY, cx: x(15), cy: y(23), r: u(2.5) }),
  ]);
}

/** Desktop NAS. */
function nas(b: Box): string {
  const { x, y, u } = artwork(b, -29.25, -33.25, 58.5, 70.5);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(-21)} ${y(32)} L ${x(-21)} ${y(36)} M ${x(21)} ${y(32)} L ${x(21)} ${y(36)}` }),
    rect({ class: BODY, x: x(-28), y: y(-32), width: u(56), height: u(64), rx: u(4) }),
    rect({ class: PANEL, x: x(-21), y: y(-23), width: u(12), height: u(41) }),
    pathEl({ class: DET, d: `M ${x(-18)} ${y(10)} L ${x(-12)} ${y(10)}` }),
    rect({ class: PANEL, x: x(-6), y: y(-23), width: u(12), height: u(41) }),
    pathEl({ class: DET, d: `M ${x(-3)} ${y(10)} L ${x(3)} ${y(10)}` }),
    rect({ class: PANEL, x: x(9), y: y(-23), width: u(12), height: u(41) }),
    pathEl({ class: DET, d: `M ${x(12)} ${y(10)} L ${x(18)} ${y(10)}` }),
    circle({ class: GLY, cx: x(18), cy: y(25), r: u(2.5) }),
  ]);
}

/** Point-to-point wireless bridge. */
function wirelessBridge(b: Box): string {
  const { x, y, u } = artwork(b, -25.25, -38.25, 69.5, 76.5);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(-24)} ${y(-37)} L ${x(-24)} ${y(37)} M ${x(-24)} ${y(-14)} L ${x(-12)} ${y(-14)} M ${x(-24)} ${y(14)} L ${x(-12)} ${y(14)}` }),
    rect({ class: BODY, x: x(-12), y: y(-29), width: u(22), height: u(58), rx: u(5) }),
    rect({ class: SCREEN, x: x(-7), y: y(-22), width: u(12), height: u(44) }),
    pathEl({ class: INK, d: `M ${x(20)} ${y(-10)} Q ${x(30)} ${y(0)} ${x(20)} ${y(10)}` }),
    pathEl({ class: GLYL, d: `M ${x(29)} ${y(-19)} Q ${x(48)} ${y(0)} ${x(29)} ${y(19)}` }),
  ]);
}

/** Software container. */
function container(b: Box): string {
  const { x, y } = artwork(b, -32.25, -30.25, 64.5, 63.5);
  return group({}, [
    pathEl({ class: BODY, d: `M ${x(-31)} ${y(-17)} L ${x(9)} ${y(-29)} L ${x(31)} ${y(-16)} L ${x(31)} ${y(20)} L ${x(-9)} ${y(32)} L ${x(-31)} ${y(19)} Z` }),
    pathEl({ class: PANEL, d: `M ${x(-31)} ${y(-17)} L ${x(-9)} ${y(-4)} L ${x(31)} ${y(-16)} L ${x(9)} ${y(-29)} Z` }),
    pathEl({ class: DET, d: `M ${x(-9)} ${y(-4)} L ${x(-9)} ${y(32)} M ${x(-31)} ${y(-17)} L ${x(-9)} ${y(-4)} L ${x(31)} ${y(-16)}` }),
    pathEl({ class: DET, d: `M ${x(-23)} ${y(-6)} L ${x(-23)} ${y(15)} M ${x(-16)} ${y(-2)} L ${x(-16)} ${y(19)} M ${x(0)} ${y(0)} L ${x(0)} ${y(23)} M ${x(10)} ${y(-3)} L ${x(10)} ${y(20)} M ${x(20)} ${y(-6)} L ${x(20)} ${y(17)}` }),
  ]);
}

/** Cellular router. */
function cellularRouter(b: Box): string {
  const { x, y, u } = artwork(b, -43.25, -43.25, 86.5, 75.5);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(-27)} ${y(-11)} L ${x(-27)} ${y(-42)}` }),
    rect({ class: BODY, x: x(-42), y: y(-11), width: u(84), height: u(42), rx: u(21) }),
    pathEl({ class: INK, d: `M ${x(-25)} ${y(8)} L ${x(-5)} ${y(8)} M ${x(-10)} ${y(3)} L ${x(-5)} ${y(8)} L ${x(-10)} ${y(13)} M ${x(-5)} ${y(20)} L ${x(-25)} ${y(20)} M ${x(-20)} ${y(15)} L ${x(-25)} ${y(20)} L ${x(-20)} ${y(25)}` }),
    rect({ class: PORT, x: x(8), y: y(16), width: u(5), height: u(5) }),
    pathEl({ class: PORT, d: `M ${x(17)} ${y(10)} L ${x(22)} ${y(10)} L ${x(22)} ${y(21)} L ${x(17)} ${y(21)} Z` }),
    pathEl({ class: GLY, d: `M ${x(26)} ${y(3)} L ${x(31)} ${y(3)} L ${x(31)} ${y(21)} L ${x(26)} ${y(21)} Z` }),
  ]);
}

/** Satellite terminal. */
function satelliteTerminal(b: Box): string {
  const { x, y, u } = artwork(b, -33.6821, -41, 75.6821, 79.25);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(-2)} ${y(15)} L ${x(-2)} ${y(31)} M ${x(-2)} ${y(25)} L ${x(-21)} ${y(37)} M ${x(-2)} ${y(25)} L ${x(17)} ${y(37)}` }),
    pathEl({ class: PANEL, d: `M ${x(-31)} ${y(-29)} Q ${x(-35)} ${y(31)} ${x(30)} ${y(25)} Z` }),
    pathEl({ class: INK, d: `M ${x(-9)} ${y(4)} L ${x(23)} ${y(-29)} M ${x(30)} ${y(25)} L ${x(23)} ${y(-29)}` }),
    rect({ class: BODY, x: x(19), y: y(-35), width: u(9), height: u(9), rx: u(1) }),
    pathEl({ class: GLYL, d: `M ${x(30)} ${y(-40)} Q ${x(40)} ${y(-39)} ${x(41)} ${y(-29)}` }),
  ]);
}

/** Door access controller. */
function accessControl(b: Box): string {
  const { x, y, u } = artwork(b, -40.25, -35.25, 82, 70.5);
  return group({}, [
    pathEl({ class: DET, d: `M ${x(-5)} ${y(18)} L ${x(9)} ${y(18)} L ${x(9)} ${y(5)} L ${x(16)} ${y(5)}` }),
    rect({ class: BODY, x: x(-39), y: y(-34), width: u(34), height: u(68), rx: u(3) }),
    rect({ class: PANEL, x: x(-32), y: y(-25), width: u(20), height: u(37) }),
    pathEl({ class: DET, d: `M ${x(-29)} ${y(-15)} L ${x(-15)} ${y(-15)} M ${x(-29)} ${y(-8)} L ${x(-15)} ${y(-8)} M ${x(-29)} ${y(-1)} L ${x(-15)} ${y(-1)}` }),
    el("ellipse", { class: PORT, cx: x(-13), cy: y(23), rx: u(2), ry: u(2) }),
    rect({ class: BODY, x: x(16), y: y(-21), width: u(23), height: u(47), rx: u(3) }),
    rect({ class: SCREEN, x: x(21), y: y(-15), width: u(13), height: u(13) }),
    circle({ class: GLY, cx: x(28), cy: y(-8), r: u(2.5) }),
    pathEl({ class: INK, d: `M ${x(20)} ${y(6)} L ${x(35)} ${y(6)}` }),
    pathEl({ class: PANEL, d: `M ${x(24)} ${y(10)} L ${x(41)} ${y(15)} L ${x(36)} ${y(31)} L ${x(19)} ${y(26)} Z` }),
  ]);
}

/** IoT sensor. */
function iotSensor(b: Box): string {
  const { x, y, u } = artwork(b, -17.25, -23, 46.2735, 52.25);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(0)} ${y(17)} L ${x(0)} ${y(28)}` }),
    rect({ class: BODY, x: x(-16), y: y(-21), width: u(32), height: u(38), rx: u(5) }),
    pathEl({ class: DET, d: `M ${x(-8)} ${y(-10)} L ${x(8)} ${y(-10)} M ${x(-8)} ${y(-4)} L ${x(8)} ${y(-4)} M ${x(-8)} ${y(2)} L ${x(8)} ${y(2)}` }),
    pathEl({ class: GLYL, d: `M ${x(21)} ${y(-22)} Q ${x(30)} ${y(-15)} ${x(23)} ${y(-6)}` }),
  ]);
}

/** Wall display / TV. */
function display(b: Box): string {
  const { x, y, u } = artwork(b, -56.25, -28.25, 112.5, 56.5);
  return group({}, [
    rect({ class: BODY, x: x(-55), y: y(-27), width: u(110), height: u(54), rx: u(2) }),
    rect({ class: SCREEN, x: x(-50), y: y(-22), width: u(100), height: u(42) }),
    pathEl({ class: DET, d: `M ${x(-4)} ${y(24)} L ${x(4)} ${y(24)}` }),
  ]);
}

/** Storage area network. */
function san(b: Box): string {
  const { x, y, u } = artwork(b, -73, -40.25, 128.25, 80.5);
  return group({}, [
    pathEl({ class: INK, d: `M ${x(-50)} ${y(-23)} L ${x(-63)} ${y(-23)} L ${x(-63)} ${y(23)} L ${x(-50)} ${y(23)} M ${x(-63)} ${y(0)} L ${x(-72)} ${y(0)}` }),
    rect({ class: BODY, x: x(-50), y: y(-39), width: u(104), height: u(32), rx: u(3) }),
    rect({ class: PANEL, x: x(-40), y: y(-32), width: u(15), height: u(18) }),
    rect({ class: PANEL, x: x(-19), y: y(-32), width: u(15), height: u(18) }),
    rect({ class: PANEL, x: x(2), y: y(-32), width: u(15), height: u(18) }),
    rect({ class: PANEL, x: x(23), y: y(-32), width: u(15), height: u(18) }),
    rect({ class: BODY, x: x(-50), y: y(7), width: u(104), height: u(32), rx: u(3) }),
    rect({ class: PANEL, x: x(-40), y: y(14), width: u(15), height: u(18) }),
    rect({ class: PANEL, x: x(-19), y: y(14), width: u(15), height: u(18) }),
    rect({ class: PANEL, x: x(2), y: y(14), width: u(15), height: u(18) }),
    rect({ class: PANEL, x: x(23), y: y(14), width: u(15), height: u(18) }),
    circle({ class: GLY, cx: x(46), cy: y(23), r: u(2.5) }),
  ]);
}

/** Optical line terminal. */
function olt(b: Box): string {
  const { x, y, u } = artwork(b, -65.25, -22.25, 130.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-64), y: y(-14), width: u(8), height: u(28), rx: u(1) }),
    rect({ class: BODY, x: x(56), y: y(-14), width: u(8), height: u(28), rx: u(1) }),
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    rect({ class: PANEL, x: x(-45), y: y(-12), width: u(14), height: u(24) }),
    rect({ class: PORT, x: x(-41), y: y(-8), width: u(6), height: u(6) }),
    rect({ class: PORT, x: x(-41), y: y(2), width: u(6), height: u(6) }),
    rect({ class: PANEL, x: x(-23), y: y(-12), width: u(14), height: u(24) }),
    rect({ class: PORT, x: x(-19), y: y(-8), width: u(6), height: u(6) }),
    rect({ class: PORT, x: x(-19), y: y(2), width: u(6), height: u(6) }),
    rect({ class: PANEL, x: x(-1), y: y(-12), width: u(14), height: u(24) }),
    rect({ class: PORT, x: x(3), y: y(-8), width: u(6), height: u(6) }),
    rect({ class: PORT, x: x(3), y: y(2), width: u(6), height: u(6) }),
    pathEl({ class: DET, d: `M ${x(22)} ${y(0)} L ${x(29)} ${y(0)} M ${x(29)} ${y(-10)} L ${x(29)} ${y(10)} M ${x(29)} ${y(-10)} L ${x(44)} ${y(-10)} M ${x(29)} ${y(0)} L ${x(44)} ${y(0)} M ${x(29)} ${y(10)} L ${x(44)} ${y(10)}` }),
    circle({ class: GLY, cx: x(20), cy: y(0), r: u(2.5) }),
  ]);
}

/** Optical network terminal. */
function ont(b: Box): string {
  const { x, y, u } = artwork(b, -22.25, -30.25, 44.5, 66);
  return group({}, [
    rect({ class: BODY, x: x(-21), y: y(-29), width: u(42), height: u(58), rx: u(5) }),
    el("ellipse", { class: PANEL, cx: x(0), cy: y(-11), rx: u(8), ry: u(8) }),
    el("ellipse", { class: PORT, cx: x(0), cy: y(-11), rx: u(3), ry: u(3) }),
    rect({ class: PORT, x: x(-6), y: y(7), width: u(12), height: u(12) }),
    circle({ class: GLY, cx: x(12), cy: y(21), r: u(2.5) }),
    pathEl({ class: DET, d: `M ${x(-10)} ${y(29)} L ${x(-10)} ${y(35)} L ${x(-18)} ${y(35)}` }),
  ]);
}

/** Private telephone exchange. */
function pbx(b: Box): string {
  const { x, y, u } = artwork(b, -57.25, -22.25, 114.5, 44.5);
  return group({}, [
    rect({ class: BODY, x: x(-56), y: y(-21), width: u(112), height: u(42), rx: u(3) }),
    pathEl({ class: PANEL, d: `M ${x(-5)} ${y(-2)} L ${x(-5)} ${y(6)} Q ${x(-5)} ${y(8)} ${x(-7)} ${y(8)} L ${x(-15)} ${y(8)} L ${x(-19)} ${y(3)} Q ${x(-24)} ${y(0)} ${x(-29)} ${y(3)} L ${x(-33)} ${y(8)} L ${x(-41)} ${y(8)} Q ${x(-43)} ${y(8)} ${x(-43)} ${y(6)} L ${x(-43)} ${y(-2)} C ${x(-35)} ${y(-10)} ${x(-13)} ${y(-10)} ${x(-5)} ${y(-2)} Z` }),
    rect({ class: PORT, x: x(0), y: y(-5), width: u(10), height: u(10) }),
    rect({ class: PORT, x: x(17), y: y(-5), width: u(10), height: u(10) }),
    rect({ class: PORT, x: x(34), y: y(-5), width: u(10), height: u(10) }),
    circle({ class: GLY, cx: x(47), cy: y(13), r: u(2.5) }),
  ]);
}

/** Tablet. */
function tablet(b: Box): string {
  const { x, y, u } = artwork(b, -26.25, -35.25, 52.5, 70.5);
  return group({}, [
    rect({ class: BODY, x: x(-25), y: y(-34), width: u(50), height: u(68), rx: u(5) }),
    rect({ class: SCREEN, x: x(-19), y: y(-24), width: u(38), height: u(49) }),
    el("ellipse", { class: PORT, cx: x(0), cy: y(-29), rx: u(1.5), ry: u(1.5) }),
    pathEl({ class: DET, d: `M ${x(-5)} ${y(30)} L ${x(5)} ${y(30)}` }),
  ]);
}

/** DIN-rail PLC. */
function plc(b: Box): string {
  const { x, y, u } = artwork(b, -53.75, -30.25, 107.5, 60.5);
  return group({}, [
    rect({ class: PANEL, x: x(-53), y: y(-5), width: u(106), height: u(10) }),
    rect({ class: BODY, x: x(-43), y: y(-29), width: u(39), height: u(58), rx: u(1) }),
    rect({ class: PANEL, x: x(-36), y: y(-14), width: u(25), height: u(27) }),
    rect({ class: BODY, x: x(0), y: y(-29), width: u(20), height: u(58), rx: u(1) }),
    pathEl({ class: DET, d: `M ${x(6)} ${y(-16)} L ${x(6)} ${y(16)} M ${x(13)} ${y(-16)} L ${x(13)} ${y(16)}` }),
    rect({ class: BODY, x: x(24), y: y(-29), width: u(20), height: u(58), rx: u(1) }),
    pathEl({ class: DET, d: `M ${x(30)} ${y(-16)} L ${x(30)} ${y(16)} M ${x(37)} ${y(-16)} L ${x(37)} ${y(16)}` }),
    rect({ class: PORT, x: x(-35), y: y(-25), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(-35), y: y(20), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(-23), y: y(-25), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(-23), y: y(20), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(5), y: y(-25), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(5), y: y(20), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(29), y: y(-25), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(29), y: y(20), width: u(5), height: u(5) }),
    circle({ class: GLY, cx: x(-23), cy: y(1), r: u(2.5) }),
  ]);
}

/** Uninterruptible power supply. */
function ups(b: Box): string {
  const { x, y, u } = artwork(b, -27.25, -39.25, 54.5, 78.5);
  return group({}, [
    rect({ class: BODY, x: x(-26), y: y(-38), width: u(52), height: u(76), rx: u(3) }),
    rect({ class: PANEL, x: x(-17), y: y(-28), width: u(34), height: u(13) }),
    circle({ class: GLY, cx: x(10), cy: y(-21), r: u(2.5) }),
    rect({ class: PANEL, x: x(-16), y: y(-6), width: u(28), height: u(18) }),
    rect({ class: PORT, x: x(12), y: y(0), width: u(4), height: u(6) }),
    pathEl({ class: PORT, d: `M ${x(1)} ${y(-3)} L ${x(-6)} ${y(4)} L ${x(-1)} ${y(4)} L ${x(-3)} ${y(10)} L ${x(5)} ${y(2)} L ${x(0)} ${y(2)} Z` }),
    pathEl({ class: DET, d: `M ${x(-15)} ${y(25)} L ${x(15)} ${y(25)} M ${x(-15)} ${y(30)} L ${x(15)} ${y(30)}` }),
  ]);
}

/** Industrial touch panel. */
function hmi(b: Box): string {
  const { x, y, u } = artwork(b, -48.25, -31.25, 96.5, 62.5);
  return group({}, [
    rect({ class: BODY, x: x(-47), y: y(-15), width: u(7), height: u(30), rx: u(1) }),
    rect({ class: BODY, x: x(40), y: y(-15), width: u(7), height: u(30), rx: u(1) }),
    rect({ class: BODY, x: x(-40), y: y(-30), width: u(80), height: u(60), rx: u(2) }),
    rect({ class: PANEL, x: x(-30), y: y(-20), width: u(49), height: u(40) }),
    rect({ class: SCREEN, x: x(-24), y: y(-14), width: u(16), height: u(9) }),
    pathEl({ class: DET, d: `M ${x(-24)} ${y(9)} L ${x(-13)} ${y(9)} L ${x(-13)} ${y(0)} L ${x(3)} ${y(0)} L ${x(3)} ${y(12)} L ${x(12)} ${y(12)}` }),
    rect({ class: PORT, x: x(27), y: y(1), width: u(5), height: u(5) }),
    rect({ class: PORT, x: x(27), y: y(13), width: u(5), height: u(5) }),
  ]);
}

/** Fiber media converter. */
function mediaConverter(b: Box): string {
  const { x, y, u } = artwork(b, -32.25, -17.25, 64.5, 34.5);
  return group({}, [
    rect({ class: BODY, x: x(-31), y: y(-16), width: u(62), height: u(32), rx: u(3) }),
    rect({ class: PORT, x: x(-24), y: y(-6), width: u(12), height: u(12) }),
    rect({ class: PANEL, x: x(14), y: y(-8), width: u(6), height: u(16) }),
    rect({ class: PANEL, x: x(23), y: y(-8), width: u(5), height: u(16) }),
    pathEl({ class: DET, d: `M ${x(-7)} ${y(-4)} L ${x(9)} ${y(-4)} M ${x(5)} ${y(-8)} L ${x(9)} ${y(-4)} L ${x(5)} ${y(0)} M ${x(9)} ${y(5)} L ${x(-7)} ${y(5)} M ${x(-3)} ${y(1)} L ${x(-7)} ${y(5)} L ${x(-3)} ${y(9)}` }),
  ]);
}

/** Point-of-sale terminal. */
function posTerminal(b: Box): string {
  const { x, y, u } = artwork(b, -24.25, -35.25, 48.5, 78.5);
  return group({}, [
    pathEl({ class: BODY, d: `M ${x(-17)} ${y(-34)} L ${x(17)} ${y(-34)} L ${x(23)} ${y(22)} Q ${x(23)} ${y(27)} ${x(18)} ${y(27)} L ${x(-18)} ${y(27)} Q ${x(-23)} ${y(27)} ${x(-23)} ${y(22)} Z` }),
    rect({ class: PANEL, x: x(-13), y: y(-25), width: u(26), height: u(18) }),
    rect({ class: PORT, x: x(-12), y: y(0), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(-2), y: y(0), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(8), y: y(0), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(-12), y: y(9), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(-2), y: y(9), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(8), y: y(9), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(-12), y: y(18), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(-2), y: y(18), width: u(4), height: u(4) }),
    rect({ class: PORT, x: x(8), y: y(18), width: u(4), height: u(4) }),
    pathEl({ class: INK, d: `M ${x(-13)} ${y(25)} L ${x(13)} ${y(25)}` }),
    rect({ class: BODY, x: x(-11), y: y(28), width: u(22), height: u(14), rx: u(1) }),
    pathEl({ class: DET, d: `M ${x(-7)} ${y(33)} L ${x(7)} ${y(33)}` }),
  ]);
}

/** Passive patch panel. */
function patchPanel(b: Box): string {
  const { x, y, u } = artwork(b, -65.25, -14.25, 130.5, 28.5);
  return group({}, [
    rect({ class: BODY, x: x(-64), y: y(-9), width: u(8), height: u(18), rx: u(1) }),
    rect({ class: BODY, x: x(56), y: y(-9), width: u(8), height: u(18), rx: u(1) }),
    rect({ class: BODY, x: x(-56), y: y(-13), width: u(112), height: u(26), rx: u(1) }),
    rect({ class: PORT, x: x(-46), y: y(-5), width: u(10), height: u(10) }),
    rect({ class: PORT, x: x(-29), y: y(-5), width: u(10), height: u(10) }),
    rect({ class: PORT, x: x(-12), y: y(-5), width: u(10), height: u(10) }),
    rect({ class: PORT, x: x(5), y: y(-5), width: u(10), height: u(10) }),
    rect({ class: PORT, x: x(22), y: y(-5), width: u(10), height: u(10) }),
    rect({ class: PORT, x: x(39), y: y(-5), width: u(10), height: u(10) }),
  ]);
}

function cloudText(label: string): string[] { return wrapTextToWidth(label,13,150,{fontWeight:600}); }
export function cloudSize(label: string): {w:number;h:number} {
  const lines=cloudText(label);
  return {w:Math.max(110,...lines.map(l=>estimateTextWidth(l,13,{fontWeight:600})+40)),h:Math.max(64,lines.length*17+38)};
}

/** Keep label placement and measured cloud footprint; pictorial qualifiers sit
 * in the crown above the first label line, so multi-line names remain readable. */
function cloud(b: Box, label: string, kind: DeviceKind): string {
  const x = (n: number) => r2(b.x + n * b.w), y = (n: number) => r2(b.y + n * b.h);
  const silhouette = pathEl({ class: CLOUD, d:
    `M ${x(.21)} ${y(.93)} C ${x(.015)} ${y(.93)} ${x(-.005)} ${y(.36)} ${x(.18)} ${y(.31)} ` +
    `C ${x(.19)} ${y(-.07)} ${x(.43)} ${y(-.12)} ${x(.52)} ${y(.18)} ` +
    `C ${x(.68)} ${y(-.04)} ${x(.83)} ${y(.15)} ${x(.83)} ${y(.41)} ` +
    `C ${x(.99)} ${y(.44)} ${x(1)} ${y(.93)} ${x(.81)} ${y(.93)} Z` });
  const parts = [silhouette];
  const cx = b.x + b.w * .42, cy = b.y + 15;
  if (kind === "internet") {
    parts.push(circle({ class: DET, cx, cy, r: 8 }),
      el("ellipse", { class: DET, cx, cy, rx: 3, ry: 8 }),
      pathEl({ class: DET, d: `M ${cx-8} ${cy} H ${cx+8} M ${cx-6} ${cy-4} H ${cx+6} M ${cx-6} ${cy+4} H ${cx+6}` }));
  } else if (kind === "wan") {
    parts.push(pathEl({ class: DET, d: `M ${cx-13} ${cy+4} L ${cx} ${cy-5} L ${cx+13} ${cy+4} Z` }));
    for (const [dx, dy] of [[-13,4], [0,-5], [13,4]]) {
      parts.push(rect({ class: PANEL, x: cx + dx - 2.5, y: cy + dy - 2.5, width: 5, height: 5 }));
    }
  } else if (kind === "pstn") {
    parts.push(pathEl({ class: PANEL, d: `M ${cx-10} ${cy-3} Q ${cx} ${cy-9} ${cx+10} ${cy-3} V ${cy+2} H ${cx+5} L ${cx+3} ${cy-1} Q ${cx} ${cy-3} ${cx-3} ${cy-1} L ${cx-5} ${cy+2} H ${cx-10} Z` }));
  }
  const lines = cloudText(label), baseline = b.y+b.h*.59-(lines.length-1)*8.5+4;
  parts.push(...lines.map((l,i) => textEl({class:CTX,x:b.x+b.w/2,y:baseline+i*17,"text-anchor":"middle"},l)));
  return group({}, parts);
}

/** The backbone retains both edge endpoints and its original centreline. */
function busBar(b: Box): string {
  const y = b.y + b.h / 2;
  const parts = [line({ class: "sx-net-bus", x1: b.x, y1: y, x2: b.x + b.w, y2: y })];
  for (const fraction of [.18, .5, .82]) {
    const x = r2(b.x + b.w * fraction), bottom = b.y + b.h - 2;
    parts.push(pathEl({ class: DET, d: `M ${x} ${y} V ${bottom} M ${x-4} ${bottom} H ${x+4}` }));
  }
  return group({}, parts);
}

/** Frozen layout contract, including the default for the new device kinds. */
export function iconSize(kind: DeviceKind): { w: number; h: number } {
  if (kind === "internet" || kind === "wan" || kind === "cloud" || kind === "pstn") return { w: 110, h: 64 };
  if (kind === "lan") return { w: 150, h: 24 };
  if (kind === "serverfarm") return { w: 74, h: 58 };
  return { w: 64, h: 48 };
}


export function drawDeviceIcon(d: NetworkDevice, b: Box): string {
  const parts: string[] = [];
  switch (d.kind) {
    case "server": parts.push(server(b)); break;
    case "pc": parts.push(pc(b)); break;
    case "switch": parts.push(switchBox(b)); break;
    case "firewall": parts.push(firewall(b)); break;
    case "router": parts.push(router(b)); break;
    case "database": parts.push(database(b)); break;
    case "internet": parts.push(cloud(b, d.label ?? "Internet", d.kind)); break;
    case "l3switch": parts.push(l3switch(b)); break;
    case "cloud": parts.push(cloud(b, d.label ?? "Cloud", d.kind)); break;
    case "ap": parts.push(ap(b)); break;
    case "storage": parts.push(storage(b)); break;
    case "laptop": parts.push(laptop(b)); break;
    case "printer": parts.push(printer(b)); break;
    case "ipphone": parts.push(ipphone(b)); break;
    case "gateway": parts.push(gateway(b)); break;
    case "poeswitch": parts.push(poeswitch(b)); break;
    case "loadbalancer": parts.push(loadbalancer(b)); break;
    case "monitor": parts.push(monitor(b)); break;
    case "nvr": parts.push(nvr(b)); break;
    case "mobile": parts.push(mobile(b)); break;
    case "vpngw": parts.push(vpngw(b)); break;
    case "serverfarm": parts.push(serverfarm(b)); break;
    case "modem": parts.push(modem(b)); break;
    case "wan": parts.push(cloud(b, d.label ?? "WAN", d.kind)); break;
    case "wlc": parts.push(wlc(b)); break;
    case "ids": parts.push(ids(b)); break;
    case "proxy": parts.push(proxy(b)); break;
    case "lan": parts.push(busBar(b)); break;
    case "dvr": parts.push(dvr(b)); break;
    case "encoder": parts.push(encoder(b)); break;
    case "pstn": parts.push(cloud(b, d.label ?? "PSTN", d.kind)); break;
    case "hypervisor": parts.push(hypervisor(b)); break;
    case "nas": parts.push(nas(b)); break;
    case "wireless-bridge": parts.push(wirelessBridge(b)); break;
    case "container": parts.push(container(b)); break;
    case "cellular-router": parts.push(cellularRouter(b)); break;
    case "satellite-terminal": parts.push(satelliteTerminal(b)); break;
    case "access-control": parts.push(accessControl(b)); break;
    case "iot-sensor": parts.push(iotSensor(b)); break;
    case "display": parts.push(display(b)); break;
    case "san": parts.push(san(b)); break;
    case "olt": parts.push(olt(b)); break;
    case "ont": parts.push(ont(b)); break;
    case "pbx": parts.push(pbx(b)); break;
    case "tablet": parts.push(tablet(b)); break;
    case "plc": parts.push(plc(b)); break;
    case "ups": parts.push(ups(b)); break;
    case "hmi": parts.push(hmi(b)); break;
    case "media-converter": parts.push(mediaConverter(b)); break;
    case "pos-terminal": parts.push(posTerminal(b)); break;
    case "patch-panel": parts.push(patchPanel(b)); break;
    case "camera":
      switch (d.cameraType ?? "fixed") {
        case "fixed": parts.push(cameraFixed(b)); break;
        case "bullet": parts.push(cameraBullet(b)); break;
        case "dome": parts.push(cameraDome(b)); break;
        case "ptz": parts.push(cameraPtz(b)); break;
        case "turret": parts.push(cameraTurret(b)); break;
      }
      break;
  }
  if (d.kind === "serverfarm" && d.count) {
    parts.push(textEl({ class: ITAG, x: r2(b.x+b.w-2), y: r2(b.y+b.h-2), "text-anchor": "end" }, `×${d.count}`));
  }
  return group({ class: "sx-net-symbol" }, parts);
}

/** Cloud identity controls caption placement and therefore remains unchanged. */
export function isCloudKind(kind: DeviceKind): boolean {
  return kind === "internet" || kind === "wan" || kind === "pstn" || kind === "cloud";
}
