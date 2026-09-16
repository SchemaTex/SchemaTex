import { describe, expect, it } from "vitest";
import { drawDeviceIcon, iconSize } from "../../src/diagrams/network/symbols";
import { layoutNetwork } from "../../src/diagrams/network/layout";
import { parseNetwork } from "../../src/diagrams/network/parser";
import { renderNetwork } from "../../src/diagrams/network/renderer";
import type { DeviceKind, CameraType } from "../../src/diagrams/network/types";

const additions: DeviceKind[] = [
  "database", "hypervisor", "nas", "wireless-bridge", "container", "cellular-router",
  "satellite-terminal", "access-control", "iot-sensor", "display", "san", "olt", "ont",
  "pbx", "tablet", "plc", "ups", "hmi", "media-converter", "pos-terminal", "patch-panel",
];
function icon(kind: DeviceKind, cameraType?: CameraType) {
  return drawDeviceIcon({ id: "device", kind, cameraType, groups: [] }, { x: 10, y: 20, ...iconSize(kind) });
}

describe("accepted network forms", () => {
  it.each(additions)("accepts and draws %s as its own kind", kind => {
    const ast = parseNetwork(`network\nswitch uplink\n${kind} endpoint\nuplink -- endpoint`);
    const device = ast.devices.find(d => d.id === "endpoint");
    expect(device?.kind).toBe(kind);
    expect(renderNetwork(ast)).toContain(`data-kind="${kind}"`);
    expect(device && drawDeviceIcon(device, { x: 0, y: 0, w: 64, h: 48 })).toMatch(/<(rect|circle|path|ellipse|line) /);
  });
  it("keeps NVR and DVR device labels", () => {
    expect(icon("nvr")).toContain(">NVR</text>");
    expect(icon("dvr")).toContain(">DVR</text>");
  });
  it("gives all five camera types distinct forms", () => {
    const types: CameraType[] = ["fixed", "bullet", "dome", "ptz", "turret"];
    expect(new Set(types.map(type => icon("camera", type))).size).toBe(5);
  });
  it("keeps the LAN backbone reaching both original connection edges", () => {
    expect(icon("lan")).toContain('x1="10"');
    expect(icon("lan")).toContain('x2="160"');
    expect(icon("lan")).toContain('y1="32"');
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
