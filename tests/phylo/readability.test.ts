import { test, expect } from "vitest";
import { parsePhylo, layoutPhylo, renderPhylo } from "../../src/diagrams/phylo";

test("unequal slanted branches keep distances without crossing unrelated branches", () => {
  const ast = parsePhylo('phylo\n newick: "(A:0.4,B:0.2,(C:0.7,D:0.1):0.15,E:0.9);"');
  const result = layoutPhylo(ast);
  const segments = result.branches.filter(b => !b.isConnector).map(b => ({
    b, p: result.nodes.find(n => n.node.id === b.fromId)!, q: result.nodes.find(n => n.node.id === b.toId)!,
  }));
  const cross = (a: {x:number;y:number}, b:{x:number;y:number}, c:{x:number;y:number}) =>
    (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for (const a of segments) {
    expect(a.q.x-a.p.x).toBeCloseTo(a.q.node.branchLength! * result.scale);
    for (const b of segments) {
      if (a===b || [a.b.fromId,a.b.toId].some(id => [b.b.fromId,b.b.toId].includes(id))) continue;
      const intersects = cross(a.p,a.q,b.p)*cross(a.p,a.q,b.q)<-1e-6 && cross(b.p,b.q,a.p)*cross(b.p,b.q,a.q)<-1e-6;
      expect(intersects).toBe(false);
    }
  }
});

test("Newick underscores display as spaces without changing taxon identity", () => {
  const svg=renderPhylo(layoutPhylo(parsePhylo('phylo\n newick: "(Homo_sapiens:1,Mus_musculus:2);"')));
  expect(svg).toContain('data-taxon-id="Homo_sapiens"');
  expect(svg).toMatch(/<text[^>]*tip-label-italic[^>]*>Homo sapiens<\/text>/);
});

test("scale caption stays inside the drawing", () => {
  const result=layoutPhylo(parsePhylo('phylo\n newick: "(A:1,B:2);"\n scale "substitutions/site"'));
  const svg=renderPhylo(result);
  const caption=svg.match(/<text[^>]*y="([\d.]+)"[^>]*>[^<]*substitutions\/site<\/text>/);
  expect(caption).not.toBeNull();
  expect(Number(caption![1])+4).toBeLessThanOrEqual(result.height);
});

// Deliberately generated topology/length combinations, independent of eval fixtures.
function tree(size: number, serial: { value: number }, ladder: boolean): string {
  const length = [0, 0.01, 0.2, 1, 3][serial.value++ % 5];
  if (size === 1) return `Taxon_${serial.value}:${length}`;
  const left = ladder ? size - 1 : Math.floor(size / 2);
  return `(${tree(left, serial, ladder)},${tree(size - left, serial, ladder)}):${length}`;
}

test("generated unequal trees preserve distance and keep branches and guides planar", () => {
  type Point = { x: number; y: number };
  const cross = (a: Point, b: Point, c: Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for (const ladder of [false, true]) for (const size of [3, 7, 16, 31]) {
    const ast = parsePhylo(`phylo\n newick: "${tree(size, {value: 0}, ladder)};"`);
    const layout = layoutPhylo(ast);
    const byId = new Map(layout.nodes.map(n => [n.node.id, n]));
    const segments: {p: Point; q: Point}[] = [];
    for (const b of layout.branches) {
      const p = byId.get(b.fromId)!, q = byId.get(b.toId)!;
      expect(q.x-p.x).toBeCloseTo(q.node.branchLength! * layout.scale);
      segments.push({p, q});
    }
    const anchors = Array.from(layout.tipLabels!.values());
    expect(new Set(anchors.map(p => p.x)).size).toBe(1);
    expect(anchors).toHaveLength(size);
    for (let i = 1; i < anchors.length; i++) expect(anchors[i].y-anchors[i-1].y).toBeGreaterThanOrEqual(20);
    for (const [id, q] of layout.tipLabels!) segments.push({p: byId.get(id)!, q});
    for (const a of segments) for (const b of segments) {
      const intersects = cross(a.p,a.q,b.p)*cross(a.p,a.q,b.q)<-1e-6 && cross(b.p,b.q,a.p)*cross(b.p,b.q,a.q)<-1e-6;
      expect(intersects).toBe(false);
    }
  }
});

test("renaming taxa of equal display width does not change layout geometry", () => {
  const source = 'phylo\n newick: "((Alpha:0.2,Bravo:0.1):0.4,Delta:0.8);"';
  const renamed = source.replace('Alpha','Other').replace('Bravo','Names').replace('Delta','Again');
  const coordinates = (s: string) => layoutPhylo(parsePhylo(s)).nodes.map(n => [n.x,n.y]);
  expect(coordinates(renamed)).toEqual(coordinates(source));
});

test("highlighted clades show their semantic names without duplicate DSL labels", () => {
  const source = 'phylo\n newick: "((A:1,B:1):1,C:2);"\n clade Group = (A, B)';
  const layout = layoutPhylo(parsePhylo(source));
  expect(renderPhylo(layout)).toMatch(/<text[^>]*clade-label[^>]*>Group<\/text>/);
  const renamed = layoutPhylo(parsePhylo(source.replace('clade Group', 'clade A_much_longer_group_name')));
  expect(renamed.width).toBeGreaterThan(layout.width);
});

test("nested named clades with the same center row have separate annotation columns", () => {
  const ast = parsePhylo('phylo\n newick: "(A:2,(B:1,C:1):1,D:2);"\n clade All = (A,B,C,D)\n clade Inner = (B,C)');
  const svg = renderPhylo(layoutPhylo(ast));
  const labels = [...svg.matchAll(/<text[^>]*x="([\d.]+)"[^>]*class="schematex-phylo-clade-label[^>]*>(All|Inner)<\/text>/g)];
  expect(labels).toHaveLength(2);
  expect(Math.abs(Number(labels[0][1]) - Number(labels[1][1]))).toBeGreaterThan(30);
});
