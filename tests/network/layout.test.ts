import { describe, expect, it } from "vitest";
import { parseNetwork } from "../../src/diagrams/network/parser";
import { layoutNetwork } from "../../src/diagrams/network/layout";

const box = (l: ReturnType<typeof layoutNetwork>, id: string) =>
  l.devices.find((b) => b.device.id === id)!;

describe("network layout — modes", () => {
  it("TC-1 star: hub centered, spokes on a ring, topology classified", () => {
    const l = layoutNetwork(parseNetwork(`network "Home"
  layout: star
  router gw
  pc pc1
  laptop lt1
  printer pr1
  gw -- pc1
  gw -- lt1
  gw -- pr1`));
    expect(l.topologyClass).toBe("star");
    const hub = box(l, "gw");
    // spokes are roughly equidistant from the hub center
    const d = (id: string) => Math.hypot(box(l, id).cx - hub.cx, box(l, id).cy - hub.cy);
    const r1 = d("pc1"), r2 = d("lt1"), r3 = d("pr1");
    expect(Math.abs(r1 - r2)).toBeLessThan(1);
    expect(Math.abs(r1 - r3)).toBeLessThan(1);
    expect(l.devices).toHaveLength(4);
  });

  it("TC-2 tiered: devices band edge<core<distribution<access top-to-bottom", () => {
    const l = layoutNetwork(parseNetwork(`network "Campus"
  layout: tiered
  firewall fw1 tier: edge
  l3switch cs1 tier: core
  switch d1 tier: distribution
  switch a1 tier: access
  fw1 -- cs1
  cs1 == cs2 : lag 40G
  l3switch cs2 tier: core
  cs1 -- d1
  d1 -- a1`));
    expect(l.topologyClass).toBe("hierarchical");
    expect(box(l, "fw1").cy).toBeLessThan(box(l, "cs1").cy);
    expect(box(l, "cs1").cy).toBeLessThan(box(l, "d1").cy);
    expect(box(l, "d1").cy).toBeLessThan(box(l, "a1").cy);
    // the LAG link is preserved as a link of type "lag"
    expect(l.links.some((g) => g.link.linkType === "lag")).toBe(true);
  });

  it("TC-3 CCTV: subnet boundary encloses its members; cameras below the switch", () => {
    const l = layoutNetwork(parseNetwork(`network "CCTV"
  layout: tiered
  l3switch core1 tier: core
  poeswitch poe1 tier: access
  nvr nvr1
  subnet cams "192.168.20.0/24" {
    camera cam1 type: dome ip: 192.168.20.11
    camera cam2 type: ptz ip: 192.168.20.12
    poe1
  }
  core1 -- poe1 : trunk vlan: 20 1G
  core1 -- nvr1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe`));
    const gb = l.groups.find((g) => g.group.id === "cams")!;
    expect(gb).toBeTruthy();
    for (const id of ["cam1", "cam2", "poe1"]) {
      const b = box(l, id);
      expect(b.x).toBeGreaterThanOrEqual(gb.x - 0.01);
      expect(b.x + b.w).toBeLessThanOrEqual(gb.x + gb.w + 0.01);
      expect(b.y).toBeGreaterThanOrEqual(gb.y - 0.01);
    }
    // poe links carried as type poe
    expect(l.links.filter((g) => g.link.linkType === "poe")).toHaveLength(2);
  });

  it("TC-4 spine-leaf: auto-meshes every spine to every leaf", () => {
    const l = layoutNetwork(parseNetwork(`network "Fabric"
  layout: spine-leaf
  spines: sp1 sp2
  leaves: lf1 lf2 lf3
  server h1
  lf1 -- h1 : 25G`));
    expect(l.topologyClass).toBe("spine-leaf");
    // 2 spines x 3 leaves = 6 auto links + 1 authored = 7
    expect(l.links).toHaveLength(7);
    const autos = l.links.filter((g) => g.link.auto);
    expect(autos).toHaveLength(6);
    // spines above leaves
    expect(box(l, "sp1").cy).toBeLessThan(box(l, "lf1").cy);
    expect(box(l, "h1").cy).toBeGreaterThan(box(l, "lf1").cy);
  });

  it("TC-5 no-drop guarantee: dense fan-out keeps every device and link", () => {
    const l = layoutNetwork(parseNetwork(`network
  switch sw1
  pc a ; pc b ; pc c ; pc d ; pc e
  sw1 -- a
  sw1 -- b
  sw1 -- c
  sw1 -- d
  sw1 -- e`));
    expect(l.devices).toHaveLength(6);
    expect(l.links).toHaveLength(5);
  });

  it("classifies point-to-point", () => {
    const l = layoutNetwork(parseNetwork(`network
  layout: manual
  router a
  router b
  a -- b`));
    expect(l.topologyClass).toBe("point-to-point");
  });

  it("produces a positive canvas and all device boxes inside it", () => {
    const l = layoutNetwork(parseNetwork(`network
  layout: ring
  router r1
  router r2
  router r3
  r1 -- r2
  r2 -- r3
  r3 -- r1`));
    expect(l.width).toBeGreaterThan(0);
    expect(l.height).toBeGreaterThan(0);
    for (const b of l.devices) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(l.width);
    }
  });
});
