import { expect, test } from 'vitest';
import { parseNetwork } from '../../src/diagrams/network/parser';
import { layoutNetwork } from '../../src/diagrams/network/layout';
import { renderNetwork } from '../../src/diagrams/network/renderer';

test.each(['switch', 'firewall', 'server'])('does not infer secondary links from a cross-tier %s', kind => {
  const source = `network\nlayout: spine-leaf\nspines: a b\nleaves: c d\n${kind} service\nservice -- a\nservice -- b\nservice -- c\nservice -- d`;
  expect(renderNetwork(source)).not.toContain('class="sx-net-links-secondary"');
});

test.each(['tb', 'lr'])('terminates every link on its device perimeter as degree grows (%s)', direction => {
  const source = ['network', 'layout: spine-leaf', `direction: ${direction}`, 'spines: s0 s1 s2',
    `leaves: ${Array.from({length:12}, (_, i) => `l${i}`).join(' ')}`, 'firewall service',
    ...Array.from({length:3}, (_, i) => `service -- s${i}`),
    ...Array.from({length:12}, (_, i) => `service -- l${i}`)].join('\n');
  const layout = layoutNetwork(parseNetwork(source));
  expect(layout.links).toHaveLength(51);
  for (const link of layout.links) {
    for (const [id, p] of [[link.link.from, link.points[0]], [link.link.to, link.points.at(-1)!]] as const) {
      const device = layout.devices.find(d => d.device.id === id)!;
      expect(p.x).toBeGreaterThanOrEqual(device.x - 1e-6);
      expect(p.x).toBeLessThanOrEqual(device.x + device.w + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(device.y - 1e-6);
      expect(p.y).toBeLessThanOrEqual(device.y + device.h + 1e-6);
      expect(Math.min(Math.abs(p.x-device.x), Math.abs(p.x-device.x-device.w),
        Math.abs(p.y-device.y), Math.abs(p.y-device.y-device.h))).toBeLessThan(1e-6);
    }
  }
});
