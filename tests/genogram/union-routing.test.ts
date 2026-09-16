import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { genogram } from "../../src/diagrams/genogram";

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
      points: Array.from({length: n.length / 2}, (_, i) => ({x: n[i * 2], y: n[i * 2 + 1]})) };
  });
  return { nodes, edges };
}
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 0.001;

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
