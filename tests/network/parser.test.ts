import { describe, expect, it } from "vitest";
import { parseNetwork, NetworkParseError } from "../../src/diagrams/network/parser";

describe("network parser — declarations", () => {
  it("parses devices, a title, layout and links", () => {
    const ast = parseNetwork(`network "Home"
  layout: star
  router gw "Gateway"
  pc pc1
  laptop lt1
  printer pr1
  gw -- pc1
  gw -- lt1 : wireless
  gw -- pr1`);
    expect(ast.title).toBe("Home");
    expect(ast.layout).toBe("star");
    expect(ast.devices.map((d) => d.id)).toEqual(["gw", "pc1", "lt1", "pr1"]);
    expect(ast.devices.find((d) => d.id === "gw")!.kind).toBe("router");
    expect(ast.links).toHaveLength(3);
    expect(ast.links.find((l) => l.to === "lt1")!.linkType).toBe("wireless");
  });

  it("parses device attrs: tier, camera type, ip", () => {
    const ast = parseNetwork(`network
  l3switch core1 tier: core
  camera cam1 type: dome ip: 192.168.20.11`);
    expect(ast.devices.find((d) => d.id === "core1")!.tier).toBe("core");
    const cam = ast.devices.find((d) => d.id === "cam1")!;
    expect(cam.cameraType).toBe("dome");
    expect(cam.ip).toBe("192.168.20.11");
  });

  it("parses link spec: mode, vlan, speed, port (near>far), connector ==", () => {
    const ast = parseNetwork(`network
  l3switch core1
  switch a1
  core1 -- a1 : trunk vlan: 10,20 1G port: Gi0/1>Gi1/0/24
  core1 == a1 : lag 40G`);
    const trunk = ast.links[0]!;
    expect(trunk.mode).toBe("trunk");
    expect(trunk.vlans).toEqual([10, 20]);
    expect(trunk.speed).toBe("1G");
    expect(trunk.portNear).toBe("Gi0/1");
    expect(trunk.portFar).toBe("Gi1/0/24");
    expect(ast.links[1]!.linkType).toBe("lag");
  });

  it("supports `;` statement separators and `a b c : kind` shorthand", () => {
    const ast = parseNetwork(`network
  switch sw1
  pc a ; pc b ; pc c
  x1 x2 x3 : switch tier: access`);
    expect(ast.devices.filter((d) => d.kind === "pc").map((d) => d.id)).toEqual(["a", "b", "c"]);
    const access = ast.devices.filter((d) => d.tier === "access");
    expect(access.map((d) => d.id)).toEqual(["x1", "x2", "x3"]);
  });

  it("nests group blocks and records membership", () => {
    const ast = parseNetwork(`network
  l3switch core1
  subnet cams "192.168.20.0/24" {
    camera cam1 type: dome ip: 192.168.20.11
    poe1
  }
  poeswitch poe1`);
    const g = ast.groups.find((x) => x.id === "cams")!;
    expect(g.kind).toBe("subnet");
    expect(g.members).toContain("cam1");
    expect(g.members).toContain("poe1");
    expect(ast.devices.find((d) => d.id === "cam1")!.groups).toEqual(["cams"]);
  });

  it("declares spine/leaf devices from directives", () => {
    const ast = parseNetwork(`network
  layout: spine-leaf
  spines: sp1 sp2
  leaves: lf1 lf2`);
    expect(ast.spines).toEqual(["sp1", "sp2"]);
    expect(ast.devices.find((d) => d.id === "sp1")!.kind).toBe("l3switch");
    expect(ast.devices.find((d) => d.id === "lf1")!.kind).toBe("switch");
  });

  it("accepts CJK quotes and aliases (multilayer→l3switch, workstation→pc)", () => {
    const ast = parseNetwork(`network 「办公室」
  multilayer core1 「核心交换机」
  workstation pc1`);
    expect(ast.title).toBe("办公室");
    expect(ast.devices.find((d) => d.id === "core1")!.kind).toBe("l3switch");
    expect(ast.devices.find((d) => d.id === "core1")!.label).toBe("核心交换机");
    expect(ast.devices.find((d) => d.id === "pc1")!.kind).toBe("pc");
  });
});

describe("network parser — validation", () => {
  it("throws on duplicate device id", () => {
    expect(() => parseNetwork("network\n  pc a\n  pc a")).toThrow(NetworkParseError);
    expect(() => parseNetwork("network\n  pc a\n  pc a")).toThrow(/already declared/);
  });

  it("throws on unknown kind with a suggestion", () => {
    expect(() => parseNetwork("network\n  swtich sw1")).toThrow(/did you mean "switch"/);
  });

  it("throws when a link references an undeclared device", () => {
    expect(() => parseNetwork("network\n  switch sw1\n  sw1 -- ghost")).toThrow(/undeclared device "ghost"/);
  });

  it("throws when a device ip falls outside its subnet CIDR", () => {
    const dsl = `network
  poeswitch poe1
  subnet cams "192.168.20.0/24" {
    camera cam2 type: ptz ip: 10.0.0.9
    poe1
  }
  poe1 -- cam2 : poe`;
    expect(() => parseNetwork(dsl)).toThrow(/not inside subnet 192.168.20.0\/24/);
  });

  it("warns (does not throw) on out-of-range VLAN", () => {
    const ast = parseNetwork(`network
  switch sw1
  ipphone vp1
  sw1 -- vp1 : access vlan: 5000`);
    expect(ast.warnings.some((w) => /out of range 1.4094/.test(w))).toBe(true);
    expect(ast.links[0]!.vlans).toEqual([5000]);
  });

  it("throws when the header is missing", () => {
    expect(() => parseNetwork("router r1\n  pc a")).toThrow(/must start with "network"/);
  });

  it("throws on an unclosed group block", () => {
    expect(() => parseNetwork('network\n  site hq "HQ" {\n  router r1')).toThrow(/unclosed group/);
  });
});
