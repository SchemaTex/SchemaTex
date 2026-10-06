import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { genogram, parseGenogram, layoutGenogram, renderGenogram } from "../../src/diagrams/genogram";
import { structuralCaptions } from "../../src/diagrams/genogram/captions";
import { estimateTextWidth } from "../../src/core/text-metrics";

type Point = { x: number; y: number };
const numbers = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const source = (name: string) => readFileSync(`visual-eval/cases/genogram-${name}/source.sx`, "utf8");
function geometry(svg: string) {
  // Nodes and edge paths share the chart's outer translation. Compare their
  // emitted chart coordinates, including each node's own translation.
  const nodes = [...svg.matchAll(/<g class="schematex-genogram-node\b[^>]*data-individual-id="([^"]+)"[^>]*transform="translate\(([^)]+)\)"[^>]*>([\s\S]*?)<\/g>/g)].map(m => {
    const [x, y] = numbers(m[2]);
    const shape = m[3].match(/<(rect|circle|polygon)\b[^>]*class="schematex-genogram-shape"[^>]*\/>/)![0];
    const perimeter = m[3].match(/<(rect|circle|polygon)\b[^>]*class="schematex-genogram-index-border"[^>]*\/>/)?.[0] ?? shape;
    const half = Number(perimeter.match(/(?:r|width)="([^"]+)"/)?.[1] ?? 40) / (perimeter.startsWith('<circle') ? 1 : 2);
    return { id: m[1], x, y, half, circle: shape.startsWith('<circle'), markup: m[3] };
  });
  const edges = [...svg.matchAll(/<g class="schematex-genogram-edge\b([^"]*)" data-from="([^"]+)" data-to="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)].map(m => {
    const path = m[4].match(/<path d="([^"]+)"[^>]*class="schematex-genogram-edge-path"/)![1];
    const n = numbers(path);
    return { from: m[2], to: m[3], classes: m[1], markup: m[4], path,
      points: Array.from({length: n.length / 2}, (_, i) => ({x: n[i * 2], y: n[i * 2 + 1]})),
      segments: path.split(/(?=M)/).flatMap(part => {
        const values = numbers(part);
        const points = Array.from({ length: values.length / 2 }, (_, i) => ({ x: values[i * 2], y: values[i * 2 + 1] }));
        return points.slice(1).map((b, i) => [points[i], b] as const);
      }) };
  });
  return { nodes, edges };
}
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 0.001;

function clearsBox(a: Point, b: Point, box: { x: number; y: number; width: number; height: number }) {
  // Structural paths are orthogonal. Contact at the symbol perimeter is allowed.
  if (a.x === b.x) return a.x <= box.x + 0.001 || a.x >= box.x + box.width - 0.001 ||
    Math.max(a.y, b.y) <= box.y + 0.001 || Math.min(a.y, b.y) >= box.y + box.height - 0.001;
  expect(a.y).toBe(b.y);
  return a.y <= box.y + 0.001 || a.y >= box.y + box.height - 0.001 ||
    Math.max(a.x, b.x) <= box.x + 0.001 || Math.min(a.x, b.x) >= box.x + box.width - 0.001;
}

function assertStructuralClearance(svg: string) {
  const { nodes, edges } = geometry(svg);
  const boxes = nodes.map(n => ({ x: n.x - n.half, y: n.y - n.half, width: n.half * 2, height: n.half * 2 }));
  for (const m of svg.matchAll(/<text x="([^"]+)" y="([^"]+)" class="schematex-genogram-label"[^>]*>([^<]+)<\/text>/g)) {
    const width = estimateTextWidth(m[3], 12);
    boxes.push({ x: Number(m[1]) - width / 2, y: Number(m[2]) - 12, width, height: 15 });
  }
  expect(boxes.length).toBe(nodes.length * 2);
  for (const edge of edges) for (const [a, b] of edge.segments) for (const box of boxes) {
    const circle = nodes.find(n => n.circle && n.x - n.half === box.x && n.y - n.half === box.y);
    const length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const t = circle ? Math.max(0, Math.min(1, ((circle.x - a.x) * (b.x - a.x) + (circle.y - a.y) * (b.y - a.y)) / length)) : 0;
    const clear = circle ? Math.hypot(a.x + t * (b.x - a.x) - circle.x, a.y + t * (b.y - a.y) - circle.y) >= circle.half - 0.001 : clearsBox(a, b, box);
    expect(clear, `${edge.from} → ${edge.to}: ${edge.path}`).toBe(true);
  }
  for (const union of edges.filter(e => !e.classes.includes('parent-child'))) {
    const parents = [union.from, union.to];
    for (const descent of edges.filter(e => e.classes.includes('parent-child'))) {
      const owners = descent.from.includes('+') ? descent.from.split('+') : [descent.from, descent.to];
      if (owners.every(id => parents.includes(id))) continue;
      for (const [a, b] of union.segments) for (const [c, d] of descent.segments) {
        const meet = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
          Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
        expect(meet, `${union.from} → ${union.to} crosses ${descent.from} → ${descent.to}`).toBe(false);
      }
    }
  }
  const key = (ids: string[]) => [...ids].sort().join('+');
  const childOwners = new Map(edges.filter(e => e.classes.includes('parent-child') && e.from.includes('+')).map(e => [e.to, key(e.from.split('+'))]));
  const unions = new Set(edges.filter(e => !e.classes.includes('parent-child')).map(e => key([e.from, e.to])));
  const owner = (edge: typeof edges[number]) => edge.from.includes('+') ? key(edge.from.split('+'))
    : unions.has(key([edge.from, edge.to])) ? key([edge.from, edge.to]) : childOwners.get(edge.from);
  const descents = edges.filter(e => e.classes.includes('parent-child') && !e.classes.includes('secondary'));
  for (let i = 0; i < descents.length; i++) for (let j = i + 1; j < descents.length; j++) {
    if (owner(descents[i]) === owner(descents[j])) continue;
    for (const [a, b] of descents[i].segments) for (const [c, d] of descents[j].segments) {
      const meet = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
        Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
      expect(meet, `${owner(descents[i])} descent meets ${owner(descents[j])} descent`).toBe(false);
    }
  }

}

function assertUnionChildren(svg: string, a: string, b: string, children: string[]) {
  const { nodes, edges } = geometry(svg);
  const parents = [a, b].map(id => nodes.find(n => n.id === id)!);
  const bar = edges.find(e => [a, b].includes(e.from) && [a, b].includes(e.to) && !e.classes.includes('parent-child'))!;
  const [left, right] = parents.sort((a, b) => a.x - b.x);
  for (const [point, parent] of [[bar.points[0], left], [bar.points.at(-1)!, right]] as const) {
    if (parent.circle) expect(Math.hypot(point.x - parent.x, point.y - parent.y)).toBeCloseTo(parent.half);
    else expect(Math.max(Math.abs(point.x - parent.x), Math.abs(point.y - parent.y))).toBeCloseTo(parent.half);
  }
  const drops = edges.filter(e => e.from === `${a}+${b}` && !e.classes.includes('secondary'));
  expect(drops.map(e => e.to).sort()).toEqual([...children].sort());
  if (!children.length) {
    expect(edges.filter(e => [a, b].includes(e.from) && [a, b].includes(e.to) && e.classes.includes('parent-child'))).toHaveLength(0);
    return;
  }
  const trunk = edges.find(e => [a, b].includes(e.from) && [a, b].includes(e.to) && e.classes.includes('parent-child'))!;
  const first = trunk.points[0];
  expect(bar.points.slice(1).some((p, i) => p.y === first.y && bar.points[i].y === first.y &&
    first.x > Math.min(p.x, bar.points[i].x) && first.x < Math.max(p.x, bar.points[i].x))).toBe(true);
  for (const drop of drops) {
    const child = nodes.find(n => n.id === drop.to)!;
    expect(near(drop.points.at(-1)!, { x: child.x, y: child.y - child.half })).toBe(true);
    expect(drop.points[0].y).toBe(trunk.points.at(-1)!.y);
  }
}

function primaryUnion(svg: string, a: string, b: string, children: string[]) {
  const { nodes, edges } = geometry(svg);
  const pa = nodes.find(n => n.id === a)!, pb = nodes.find(n => n.id === b)!;
  const unionEdges = edges.filter(e => [a, b].includes(e.from) && [a, b].includes(e.to));
  const bar = unionEdges.find(e => !e.classes.includes('parent-child'))!;
  expect(bar.points).toHaveLength(2);
  const [left, right] = [pa, pb].sort((a, b) => a.x - b.x);
  expect(near(bar.points[0], { x: left.x + left.half, y: left.y })).toBe(true);
  expect(near(bar.points[1], { x: right.x - right.half, y: right.y })).toBe(true);
  for (const node of nodes.filter(n => n.y === pa.y && n.id !== a && n.id !== b)) {
    expect(node.x < left.x || node.x > right.x).toBe(true);
  }
  const trunk = unionEdges.find(e => e.classes.includes('parent-child') && e.points[0].y === pa.y)!;
  expect(trunk.points).toHaveLength(2); // No neighbour-crossing elbow.
  expect(trunk.points[0].x).toBeCloseTo((pa.x + pb.x) / 2);
  expect(trunk.points[1].x).toBe(trunk.points[0].x);
  const drops = children.map(child => edges.find(e => e.from === `${a}+${b}` && e.to === child && !e.classes.includes('secondary'))!);
  const xs = drops.map(e => e.points[0].x);
  expect(trunk.points[1].x).toBeGreaterThanOrEqual(Math.min(...xs) - 0.001);
  expect(trunk.points[1].x).toBeLessThanOrEqual(Math.max(...xs) + 0.001);
  for (const drop of drops) {
    const child = nodes.find(n => n.id === drop.to)!;
    expect(drop.points[0].y).toBe(trunk.points[1].y);
    expect(near(drop.points.at(-1)!, {x: child.x, y: child.y - child.half})).toBe(true);
  }
  return { left: Math.min(...xs), right: Math.max(...xs), y: trunk.points[1].y };
}

describe('rendered union ownership', () => {
  it('uses route metadata instead of guessing from a four-point path', () => {
    const ast = parseGenogram(`genogram
  a [male]
  b [female]
  a -x- b "ended"`);
    const layout = layoutGenogram(ast, { nodeWidth: 40, nodeHeight: 40, nodeSpacingX: 80, nodeSpacingY: 100 });
    const edge = layout.edges[0];
    edge.path = 'M 100 200 L 100 100 L 300 100 L 300 200';
    delete edge.unionRoute;
    const caption = structuralCaptions(layout.edges, [], 12)[0];
    expect(caption.box.x + caption.box.width / 2).toBe(300);
    const svg = renderGenogram({ ...layout, nodes: [] }, { fontSize: 12, fontFamily: 'sans-serif', theme: 'default', padding: 20 });
    expect(svg).toContain('x1="96" y1="144"');
    edge.unionRoute = { kind: 'bracket', left: 100, right: 300, y: 100, markX: 240 };
    const routed = structuralCaptions(layout.edges, [], 12)[0];
    expect(routed.box.x + routed.box.width / 2).toBe(240);
    const routedSvg = renderGenogram({ ...layout, nodes: [] }, { fontSize: 12, fontFamily: 'sans-serif', theme: 'default', padding: 20 });
    expect(routedSvg).toContain('x1="236" y1="94"');
  });

  it.each(['mother', 'father'])('routes three unions around intervening partners: %s', variant => {
    const svg = genogram.render(source(`three-unions-${variant}`));
    const { nodes, edges } = geometry(svg);
    const order = variant === 'mother' ? ['mark', 'chris', 'dana', 'rick'] : ['ruth', 'carol', 'walter', 'june'];
    expect(nodes.filter(n => order.includes(n.id)).sort((a, b) => a.x - b.x).map(n => n.id)).toEqual(order);
    const children = variant === 'mother' ? ['maya', 'leo', 'tess'] : ['paul', 'anne', 'ben', 'lucy'];
    expect(nodes.filter(n => children.includes(n.id)).sort((a, b) => a.x - b.x).map(n => n.id)).toEqual(children);
    if (variant === 'mother') {
      assertUnionChildren(svg, 'mark', 'dana', ['maya']);
      assertUnionChildren(svg, 'chris', 'dana', ['leo']);
      assertUnionChildren(svg, 'dana', 'rick', ['tess']);
    } else {
      assertUnionChildren(svg, 'walter', 'ruth', ['paul', 'anne']);
      assertUnionChildren(svg, 'walter', 'carol', []);
      assertUnionChildren(svg, 'walter', 'june', ['ben', 'lucy']);
      expect(edges.find(e => e.from === 'ruth' && e.to === 'walter' && !e.classes.includes('parent-child'))!.markup).not.toContain('divorce-mark');
      expect(nodes.find(n => n.id === 'walter')!.half).toBe(24);
      expect(svg).toContain('Ruth (1942–1975)');
    }
    const unions = edges.filter(e => !e.classes.includes('parent-child'));
    expect(unions).toHaveLength(3);
    expect(unions.map(e => e.points.length).sort()).toEqual([2, 2, 4]);
    const bracket = unions.find(e => e.points.length === 4)!;
    expect(bracket.points[1].y).toBeLessThan(Math.min(...nodes.filter(n => order.includes(n.id)).map(n => n.y - n.half)));
    if (variant === 'mother') {
      const marks = [...bracket.markup.matchAll(/<line x1="[^"]+" y1="([^"]+)"[^>]*class="schematex-genogram-divorce-mark"/g)];
      expect(marks).toHaveLength(2);
      for (const mark of marks) expect(Number(mark[1])).toBe(bracket.points[1].y - 6);
    }
    assertStructuralClearance(svg);
  });

  it.each([3, 4, 5])('keeps %i unions and their children distinct with either parent sex and current-first declarations', count => {
    for (const sex of ['male', 'female']) {
      const partnerSex = sex === 'male' ? 'female' : 'male';
      const unions = Array.from({ length: count }, (_, i) => `  partner${i} [${partnerSex}]\n  shared ${i === count - 1 ? '--' : '-x-'} partner${i}\n    child${i} [${sex}, ${2000 + i}]`);
      for (const currentFirst of [false, true]) {
        const svg = genogram.render(`genogram\n  shared [${sex}, index]\n${(currentFirst ? [unions.at(-1)!, ...unions.slice(0, -1)] : unions).join('\n')}`);
        const { nodes, edges } = geometry(svg);
        const order = [...Array.from({ length: count - 1 }, (_, i) => `partner${i}`), 'shared', `partner${count - 1}`];
        expect(nodes.filter(n => order.includes(n.id)).sort((a, b) => a.x - b.x).map(n => n.id)).toEqual(order);
        expect(edges.filter(e => !e.classes.includes('parent-child'))).toHaveLength(count);
        for (let i = 0; i < count; i++) assertUnionChildren(svg, 'shared', `partner${i}`, [`child${i}`]);
        assertStructuralClearance(svg);
      }
    }
  });

  it('keeps a remarried former partner outside a shared parent with three unions', () => {
    const svg = genogram.render(`genogram
  shared [female]
  former [male]
  shared ~/~ former
    first [female, 2000]
  second [male]
  shared ~/~ second
    middle [male, 2005]
  current [male]
  shared ~ current
    youngest [female, 2010]
  other [female]
  former -- other
    step_sibling [male, 2003]`);
    const { nodes } = geometry(svg);
    const order = ['other', 'former', 'second', 'shared', 'current'];
    expect(nodes.filter(n => order.includes(n.id)).sort((a, b) => a.x - b.x).map(n => n.id)).toEqual(order);
    assertUnionChildren(svg, 'shared', 'former', ['first']);
    assertUnionChildren(svg, 'shared', 'second', ['middle']);
    assertUnionChildren(svg, 'shared', 'current', ['youngest']);
    assertUnionChildren(svg, 'former', 'other', ['step_sibling']);
    assertStructuralClearance(svg);
  });

  it.each([0, 1])('places every remarried former partner on its far side: branch %i', former => {
    const svg = genogram.render(`genogram
  shared [female]
  first [male]
  shared -x- first
    child0 [female, 2000]
    sibling0 [male, 2002]
  second [male]
  shared -x- second
    child1 [male, 2005]
    sibling1 [female, 2007]
  current [male]
  shared -- current
    child2 [female, 2010]
  outside [female]
  ${former ? 'second' : 'first'} -- outside
    other_child [male, 2003]`);
    const { nodes, edges } = geometry(svg);
    const x = (id: string) => nodes.find(n => n.id === id)!.x;
    expect(x('outside')).toBeLessThan(x(former ? 'second' : 'first'));
    expect(x('first')).toBeLessThan(x('second'));
    expect(x('second')).toBeLessThan(x('shared'));
    assertUnionChildren(svg, 'shared', 'first', ['child0', 'sibling0']);
    assertUnionChildren(svg, 'shared', 'second', ['child1', 'sibling1']);
    assertUnionChildren(svg, 'shared', 'current', ['child2']);
    assertUnionChildren(svg, former ? 'second' : 'first', 'outside', ['other_child']);
    const trunks = edges.filter(e => e.classes.includes('parent-child') && !e.from.includes('+'));
    expect(new Set(trunks.map(e => e.points[0].x)).size).toBe(trunks.length);
    const children = ['child0', 'child1', 'child2', 'other_child'].map(x).sort((a,b)=>a-b);
    for (let i=1;i<children.length;i++) expect(children[i]-children[i-1]).toBeGreaterThanOrEqual(120);
    assertStructuralClearance(svg);
  });

  it('keeps multiple spouses of a former partner outside the larger union group', () => {
    const svg = genogram.render(`genogram
  shared [female]
  former [male]
  shared -x- former
    own0 [female]
  second [male]
  shared -x- second
    own1 [male]
  third [male]
  shared -x- third
    own2 [female]
  current [male]
  shared -- current
    own3 [male]
  outside0 [female]
  former -x- outside0
    other0 [female]
  outside1 [female]
  former -- outside1
    other1 [male]`);
    const { nodes, edges } = geometry(svg);
    const x = (id: string) => nodes.find(n => n.id === id)!.x;
    expect(x('outside0')).toBeLessThan(x('former'));
    expect(x('outside1')).toBeLessThan(x('former'));
    expect(x('former')).toBeLessThan(x('shared'));
    const trunks = edges.filter(e => e.classes.includes('parent-child') && !e.from.includes('+'));
    expect(new Set(trunks.map(e => e.points[0].x)).size).toBe(trunks.length);
    assertStructuralClearance(svg);
  });

  it('separates ancestral entries from bracket ports and gaps actual crossings', () => {
    const svg = genogram.render(source('three-unions-parents-above'));
    assertStructuralClearance(svg);
    for (const [a, b, child] of [['mark', 'dana', 'maya'], ['chris', 'dana', 'leo'], ['dana', 'rick', 'tess']]) assertUnionChildren(svg, a, b, [child]);
    const { nodes, edges } = geometry(svg);
    const bracket = edges.find(e => e.from === 'mark' && e.to === 'dana' && !e.classes.includes('parent-child'))!;
    expect(bracket.path.match(/M/g)).toHaveLength(2);
    const dana = nodes.find(n => n.id === 'dana')!;
    expect(bracket.points.at(-1)!.x).not.toBe(dana.x);
    for (const union of edges.filter(e => !e.classes.includes('parent-child'))) {
      const marks = [...union.markup.matchAll(/<line x1="([^"]+)"[^>]*class="schematex-genogram-divorce-mark"/g)].map(m=>Number(m[1])+4);
      const trunk = edges.find(e => e.classes.includes('parent-child') && e.from === union.from && e.to === union.to);
      if (trunk) for (const mark of marks) expect(Math.abs(mark-trunk.points[0].x)).toBeGreaterThan(10);
    }
  });

  it('keeps the shared parent between former/current partners and connects its own ancestry', () => {
    const svg = genogram.render(source('blended-family'));
    const {nodes, edges} = geometry(svg);
    const x = (id: string) => nodes.find(n => n.id === id)!.x;
    expect(nodes.map(n => n.id).filter(id => id === 'david')).toHaveLength(1);
    expect(x('laura')).toBeLessThan(x('david'));
    expect(x('david')).toBeLessThan(x('emma'));
    const first = primaryUnion(svg, 'david', 'laura', ['sophie', 'oliver']);
    const second = primaryUnion(svg, 'david', 'emma', ['lucy', 'henry']);
    expect(first.right).toBeLessThan(second.left);
    expect(first.y).toBe(second.y);
    const david = nodes.find(n => n.id === 'david')!;
    expect(near(edges.find(e => e.from === 'george+helen' && e.to === 'david')!.points.at(-1)!, {x:david.x,y:david.y-david.half})).toBe(true);
    expect(svg.match(/class="schematex-genogram-divorce-mark"/g)).toHaveLength(2);
    expect(genogram.render(source('blended-family'))).toBe(svg);
  });

  it('places the former union first even when the current union is declared first', () => {
    const svg = genogram.render(`genogram
  shared [male]
  current [female]
  shared -- current
    younger [female, 2010]
  former [female]
  shared -x- former
    older [male, 2000]`);
    const nodes = geometry(svg).nodes;
    const x = (id: string) => nodes.find(n=>n.id===id)!.x;
    expect(x('former')).toBeLessThan(x('shared'));
    expect(x('shared')).toBeLessThan(x('current'));
    const first = primaryUnion(svg, 'shared', 'former', ['older']);
    const second = primaryUnion(svg, 'shared', 'current', ['younger']);
    expect(first.right).toBeLessThan(second.left);
    expect(first.y).toBe(second.y);
  });

  it('assigns disjoint, equal-height primary intervals throughout a four-person chain', () => {
    const svg = genogram.render(source('divorce-remarriage-stepchildren'));
    const a = primaryUnion(svg, 'alex', 'jordan', ['maya', 'leo']);
    const b = primaryUnion(svg, 'alex', 'sam', ['noah', 'ivy']);
    const c = primaryUnion(svg, 'casey', 'sam', ['ella']);
    expect(a.right).toBeLessThan(b.left);
    expect(b.right).toBeLessThan(c.left);
    expect([a.y, b.y, c.y]).toEqual([a.y, a.y, a.y]);
    expect(geometry(svg).nodes.slice().sort((a,b)=>a.x-b.x).filter(n=>['jordan','alex','sam','casey'].includes(n.id)).map(n=>n.id)).toEqual(['jordan','alex','sam','casey']);
  });

  it.each(['divorce-remarriage-stepchildren', 'adoption-foster'])('attaches secondary routes to individual children on distinct tracks: %s', name => {
    const svg = genogram.render(source(name));
    const {nodes, edges} = geometry(svg);
    const secondary = edges.filter(e => e.classes.includes('secondary'));
    expect(secondary).toHaveLength(name === 'adoption-foster' ? 2 : 3);
    for (const edge of secondary) {
      expect(edge.path.match(/[ML]/g)).toEqual(['M', 'L', 'L', 'L']);
      const [a,b,c,d] = edge.points;
      expect(a.x).toBe(b.x); expect(b.y).toBe(c.y); expect(c.x).toBe(d.x);
      expect(a.y).toBeLessThan(b.y); expect(c.y).toBeLessThan(d.y); expect(b.x).not.toBe(c.x);
      const parents = edge.from.split('+').map(id=>nodes.find(n=>n.id===id)!);
      expect(a.y).toBe(parents[0].y);
      expect(a.x).toBeGreaterThan(Math.min(...parents.map(n=>n.x+n.half)));
      expect(a.x).toBeLessThan(Math.max(...parents.map(n=>n.x-n.half)));
      const child = nodes.find(n=>n.id===edge.to)!;
      if (child.circle) expect(Math.hypot(d.x-child.x,d.y-child.y)).toBeCloseTo(child.half);
      else expect(d.y).toBe(child.y-child.half);
      expect(d.x).not.toBe(child.x);
      const primary = edges.find(e=>e.to===edge.to && !e.classes.includes('secondary') && e.from.includes('+'))!;
      expect(primary).toBeDefined();
      expect(b.y).toBeGreaterThanOrEqual(primary.points[0].y+12);
      expect(edge.markup).toContain('class="schematex-genogram-placement-halo"');
      expect(edge.markup.indexOf('placement-halo')).toBeLessThan(edge.markup.indexOf('edge-path'));
    }
    for (let i=0;i<secondary.length;i++) for (let j=i+1;j<secondary.length;j++) {
      const [a,b]=[secondary[i].points,secondary[j].points];
      const overlap=Math.max(Math.min(a[1].x,a[2].x),Math.min(b[1].x,b[2].x))<Math.min(Math.max(a[1].x,a[2].x),Math.max(b[1].x,b[2].x));
      if(overlap) expect(Math.abs(a[1].y-b[1].y)).toBeGreaterThanOrEqual(12);
    }
    if(name==='adoption-foster') {
      expect(edges.find(e=>e.to==='theo'&&!e.classes.includes('secondary'))!.from).toBe('ben+lara');
      expect(edges.find(e=>e.to==='ivy'&&!e.classes.includes('secondary'))!.from).toBe('ben+lara');
      expect(edges.find(e=>e.to==='finn')!.from).toBe('noel+rae');
    }
  });
});

describe('mixed rendered structural routing', () => {
  it('preserves twin branches and primary ownership alongside an emotional tie', () => {
    const input = `genogram "Mixed union"
  p [male, 1970]
  ex [female, 1971]
  p -x- ex
    first [male, 2000, twin-identical]
    second [male, 2000, twin-identical]
  current [female, 1975]
  p -- current
    own [female, 2005]
  ex -close- current`;
    const svg = genogram.render(input);
    const { nodes, edges } = geometry(svg);
    const twins = edges.find(e => e.classes.includes('twin-identical'))!;
    expect(twins).toBeDefined();
    for (const id of ['first', 'second']) {
      const child = nodes.find(n => n.id === id)!;
      expect(twins.points.some(p => near(p, {x:child.x,y:child.y-child.half}))).toBe(true);
      expect(nodes.filter(n => n.id === id)).toHaveLength(1);
      expect(edges.filter(e => e.from==='p+current' && e.to===id && !e.classes.includes('secondary'))).toHaveLength(0);
    }
    expect(edges.find(e=>e.to==='own')!.from).toBe('p+current');
    expect(edges.filter(e=>e.classes.includes('secondary'))).toHaveLength(0);
    expect(svg).toContain('class="schematex-genogram-emotional schematex-genogram-emotional-close" data-from="ex" data-to="current"');
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(genogram.render(input)).toBe(svg);
  });

  it('expands a crowded secondary band and keeps every track inside the rendered canvas', () => {
    const children = Array.from({length: 8}, (_,i)=>`    child${i} [male, ${2000+i}]`).join('\n');
    const placement = Array.from({length: 8}, (_,i)=>`    child${i} [step]`).join('\n');
    const svg = genogram.render(`genogram\n  a [male]\n  b [female]\n  a -- b\n${children}\n  c [male]\n  d [female]\n  c -- d\n${placement}`);
    const {edges,nodes} = geometry(svg);
    const tracks = edges.filter(e=>e.classes.includes('secondary'));
    const [, , width, height] = numbers(svg.match(/viewBox="([^"]+)"/)![1]);
    expect(tracks).toHaveLength(8);
    for (let i=0;i<tracks.length;i++) for (let j=i+1;j<tracks.length;j++) {
      const a=tracks[i].points, b=tracks[j].points;
      if (Math.max(Math.min(a[1].x,a[2].x),Math.min(b[1].x,b[2].x)) < Math.min(Math.max(a[1].x,a[2].x),Math.max(b[1].x,b[2].x))) {
        expect(Math.abs(a[1].y-b[1].y)).toBeGreaterThanOrEqual(12);
      }
    }
    const childTop=nodes.find(n=>n.id==='child0')!.y-20;
    const ordinary = geometry(genogram.render(`genogram\n  a [male]\n  b [female]\n  a -- b\n${children}\n  c [male]\n  d [female]\n  c -- d`));
    expect(childTop).toBeGreaterThan(ordinary.nodes.find(n=>n.id==='child0')!.y-20);
    for(const track of tracks) {
      expect(track.points[1].y+12).toBeLessThanOrEqual(childTop);
      for(const p of track.points) {
        expect(p.x).toBeGreaterThanOrEqual(0); expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(width); expect(p.y).toBeLessThan(height);
      }
    }
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
});
