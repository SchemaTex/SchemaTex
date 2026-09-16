import { expect, it } from "vitest";
import { renderNetwork, renderNetworkLayout } from "../../src/diagrams/network/renderer";
import { parseNetwork } from "../../src/diagrams/network/parser";
import { layoutNetwork } from "../../src/diagrams/network/layout";
import type { SceneItem } from "../../src/core/types";
import { labelOverlap } from "../../src/core/label-placement";
import { estimateTextWidth } from "../../src/core/text-metrics";

it.each(["VLAN 73 Lab", "vlan 73 Lab", "73 Lab", "VLANs Lab"])("prefixes a VLAN boundary exactly once: %s", (name) => {
  const svg = renderNetwork(`network
vlan segment "${name}" {
  router gateway
}`);
  const tag = /class="sx-net-boundary-label"[^>]*>([^<]*)</.exec(svg)![1];
  expect(tag).toBe(/^vlan\b/i.test(name) ? name : `VLAN ${name}`);
});

it("moves a link annotation away from a measured device caption without losing text", () => {
  const layout = layoutNetwork(parseNetwork(`network
router upstream "Uplink device"
pc workstation "Desk computer"
upstream -- workstation : label="Diagnostic channel"`));
  const device = layout.devices[0];
  const baseline = device.y + device.h + 6 + 11;
  layout.links[0].labelX = device.cx;
  layout.links[0].labelY = baseline + 3;
  const scene: SceneItem[] = [];
  const svg = renderNetworkLayout(layout, { __scene: scene });
  const box = scene.find((item) => item.kind === "label")!.bbox!;
  const width = estimateTextWidth(device.device.label!, 12);
  expect(labelOverlap(box, { x: device.cx - width / 2, y: baseline - 12, width, height: 16 })).toBe(0);
  expect(svg).toContain("Diagnostic channel");
});

it("keeps internal annotations clear of boundary edges and titles across one render pass", () => {
  const layout = layoutNetwork(parseNetwork(`network
site office "Office boundary" {
  router upstream
  pc workstation
  printer peripheral
}
upstream -- workstation : label="First channel"
upstream -- peripheral : label="Second channel"`));
  const boundary = layout.groups[0];
  for (const link of layout.links) {
    link.labelX = boundary.x + 8;
    link.labelY = boundary.y + 16;
  }
  const scene: SceneItem[] = [];
  renderNetworkLayout(layout, { __scene: scene });
  const labels = scene.filter((item) => item.kind === "label").map((item) => item.bbox!);
  expect(labels).toHaveLength(2);
  for (const box of labels) {
    expect(box.x).toBeGreaterThan(boundary.x + 1);
    expect(box.y).toBeGreaterThan(boundary.y + 1);
    expect(box.x + box.width).toBeLessThan(boundary.x + boundary.w - 1);
    expect(box.y + box.height).toBeLessThan(boundary.y + boundary.h - 1);
    expect(labelOverlap(box, { x: boundary.x + 10, y: boundary.y + 3,
      width: estimateTextWidth("Office boundary", 10, { fontWeight: 600 }), height: 14 })).toBe(0);
  }
  expect(labelOverlap(labels[0], labels[1])).toBe(0);
});
