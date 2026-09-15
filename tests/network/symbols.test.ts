import { describe, expect, it } from "vitest";
import { drawDeviceIcon, iconSize, cloudSize } from "../../src/diagrams/network/symbols";
import { layoutNetwork } from "../../src/diagrams/network/layout";
import { parseNetwork } from "../../src/diagrams/network/parser";
import { renderNetwork } from "../../src/diagrams/network/renderer";
import type { DeviceKind, CameraType } from "../../src/diagrams/network/types";

const existing: DeviceKind[] = [
  "router", "switch", "l3switch", "poeswitch", "firewall", "loadbalancer", "ap",
  "wlc", "gateway", "modem", "ids", "proxy", "vpngw", "server", "serverfarm",
  "pc", "laptop", "mobile", "ipphone", "printer", "storage", "camera", "nvr",
  "dvr", "encoder", "monitor", "internet", "cloud", "wan", "lan", "pstn",
];
const additions: DeviceKind[] = [
  "database", "hypervisor", "nas", "wireless-bridge", "container", "cellular-router",
  "satellite-terminal", "access-control", "iot-sensor", "display", "san", "olt", "ont",
  "pbx", "tablet", "plc", "ups", "hmi", "media-converter", "pos-terminal", "patch-panel",
];
function icon(kind: DeviceKind, cameraType?: CameraType) {
  return drawDeviceIcon({ id: "device", kind, cameraType, groups: [] }, { x: 10, y: 20, ...iconSize(kind) });
}
function count(svg: string, className: string) {
  return [...svg.matchAll(new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`, "g"))].length;
}

describe("accepted network forms", () => {
  it.each(existing)("freezes the layout footprint of %s", kind => {
    const expected = kind === "lan" ? { w: 150, h: 24 }
      : kind === "serverfarm" ? { w: 74, h: 58 }
      : ["internet", "cloud", "wan", "pstn"].includes(kind) ? { w: 110, h: 64 }
      : { w: 64, h: 48 };
    expect(iconSize(kind)).toEqual(expected);
  });
  it("retains content-measured cloud footprints", () => {
    expect(cloudSize("Internet")).toEqual({ w: 110, h: 64 });
    expect(cloudSize("Regional private backbone interconnection")).toEqual({ w: 145.5548, h: 89 });
  });
  it.each(additions)("accepts and draws %s as its own kind", kind => {
    const ast = parseNetwork(`network\nswitch uplink\n${kind} endpoint\nuplink -- endpoint`);
    const device = ast.devices.find(d => d.id === "endpoint");
    expect(device?.kind).toBe(kind);
    expect(iconSize(kind)).toEqual({ w: 64, h: 48 });
    expect(renderNetwork(ast)).toContain(`data-kind="${kind}"`);
    expect(device && drawDeviceIcon(device, { x: 0, y: 0, w: 64, h: 48 })).toMatch(/<(rect|circle|path|ellipse|line) /);
  });
  it("gives every new kind its own form", () => {
    expect(new Set(additions.map(kind => icon(kind))).size).toBe(additions.length);
  });
  it.each(additions)("suggests %s using the existing unknown-kind path", kind => {
    expect(() => parseNetwork(`network\n${kind}x endpoint`)).toThrow(`did you mean "${kind}"`);
  });
  it("uses four substantial switch ports and two server drive bays", () => {
    expect(count(icon("switch"), "sx-net-port-solid")).toBe(4);
    expect(count(icon("server"), "sx-net-panel")).toBe(2);
  });
  it("uses a rounded router puck with four filled arrowheads", () => {
    expect(icon("router")).toMatch(/<rect[^>]+rx=/);
    expect(count(icon("router"), "sx-net-port-solid")).toBe(2);
    expect(count(icon("router"), "sx-net-glyph")).toBe(4);
  });
  it("joins the PC stand to the foot", () => {
    // The vertical stem ends at the foot's baseline, rather than floating above it.
    const stand = icon("pc").match(/<path[^>]*d="([^"]+)"/)?.[1];
    const coords = stand?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    expect(coords).toHaveLength(8);
    expect(coords[3]).toBe(coords[5]);
  });
  it("draws four monitor feeds by default and no frame on PC screen", () => {
    expect(count(icon("monitor"), "sx-net-screen")).toBe(4);
    expect(count(icon("pc"), "sx-net-screen")).toBe(1);
  });
  it("replaces storage cylinder with four removable caddies", () => {
    expect(count(icon("storage"), "sx-net-panel")).toBe(4);
  });
  it("keeps recorder tags and distinguishes Ethernet from coax", () => {
    expect(icon("nvr")).toContain(">NVR</text>");
    expect(icon("dvr")).toContain(">DVR</text>");
    expect(count(icon("nvr"), "sx-net-port-solid")).toBe(2);
    expect(count(icon("dvr"), "sx-net-port-solid")).toBe(1);
  });
  it("uses PoE and GW tags, and pictorial appliance qualifiers", () => {
    expect(icon("poeswitch")).toContain(">PoE</text>");
    expect(icon("gateway")).toContain(">GW</text>");
    for (const kind of ["vpngw", "ids", "proxy", "loadbalancer", "modem", "wlc", "encoder"] satisfies DeviceKind[]) {
      expect(icon(kind)).not.toContain("<text");
    }
  });
  it("gives all five camera types distinct forms without a dashed PTZ orbit", () => {
    const types: CameraType[] = ["fixed", "bullet", "dome", "ptz", "turret"];
    expect(new Set(types.map(type => icon("camera", type))).size).toBe(5);
    expect(icon("camera", "ptz")).not.toContain("stroke-dasharray");
  });
  it("keeps the LAN backbone reaching both original connection edges", () => {
    expect(icon("lan")).toContain('x1="10"');
    expect(icon("lan")).toContain('x2="160"');
    expect(icon("lan")).toContain('y1="32"');
    expect(count(icon("lan"), "sx-net-detail")).toBe(3);
  });
  it.each([...existing, ...additions])("themes %s through classes without scaling strokes or fonts", kind => {
    const svg = icon(kind);
    expect(svg).not.toMatch(/scale\(|style=|#[\da-fA-F]{3,8}|stroke-width=|font-size=/);
    expect(svg).toContain("class=");
  });
});

describe("promoted device kinds retain their former layout roles", () => {
  it.each([
    ["database", "server"], ["hypervisor", "server"], ["nas", "storage"],
    ["san", "storage"], ["tablet", "mobile"], ["db", "server"], ["dbserver", "server"],
  ])("keeps dual-homed %s at the same position as its former %s alias", (kind, formerKind) => {
    const source = (deviceKind: string) => `network
router edge tier: edge
switch core tier: core
${deviceKind} endpoint
edge -- core
edge -- endpoint
core -- endpoint`;
    const geometry = (deviceKind: string) => {
      const layout = layoutNetwork(parseNetwork(source(deviceKind)));
      return {
        width: layout.width, height: layout.height,
        devices: layout.devices.map(({ device, ...box }) => ({ id: device.id, ...box })),
        links: layout.links,
        groups: layout.groups,
      };
    };
    expect(geometry(kind)).toEqual(geometry(formerKind));
  });
});
