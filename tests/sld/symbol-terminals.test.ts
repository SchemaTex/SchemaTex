import { expect, test } from "vitest";
import { geometryFor, renderSymbol } from "../../src/diagrams/sld/symbols";
import type { SLDNodeType } from "../../src/core/types";

const types: SLDNodeType[] = ["utility", "generator", "solar", "wind", "ups", "transformer", "transformer_dy", "transformer_yd", "transformer_yy", "transformer_dd", "autotransformer", "transformer_3winding", "bus", "bus_tie", "hub", "breaker", "breaker_vacuum", "switch", "switch_load", "contactor", "ground_switch", "ats", "recloser", "sectionalizer", "fuse", "fuse_cl", "ct", "pt", "relay", "surge_arrester", "ground_fault", "rcd", "motor", "load", "capacitor_bank", "harmonic_filter", "vfd", "watthour_meter", "demand_meter", "consumer_unit", "unknown"];

// Resolve nested SVG transforms so this checks the routed coordinates, not
// just the local numbers inside scaled artwork.
function lineEndpoints(svg: string): number[][] {
  type Matrix = [number, number, number, number, number, number];
  const identity: Matrix = [1, 0, 0, 1, 0, 0];
  const multiply = (a: Matrix, b: Matrix): Matrix => [
    a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
    a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5],
  ];
  const stack: Matrix[] = [identity];
  const points: number[][] = [];
  for (const [tag] of svg.matchAll(/<g\b[^>]*>|<\/g>|<line\b[^>]*>/g)) {
    if (tag === '</g>') { stack.pop(); continue; }
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1],m[2]]));
    if (tag.startsWith('<g')) {
      let matrix = stack.at(-1)!;
      for (const [,op,args] of (attrs.transform ?? '').matchAll(/(scale|rotate|translate)\(([^)]+)\)/g)) {
        const [x,y] = args.split(/[ ,]+/).map(Number);
        const angle = x*Math.PI/180;
        const next: Matrix = op==='scale' ? [x,0,0,y??x,0,0]
          : op==='translate' ? [1,0,0,1,x,y??0]
          : [Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0];
        matrix = multiply(matrix,next);
      }
      stack.push(matrix);
    } else {
      const [a,b,c,d,e,f] = stack.at(-1)!;
      for (const n of ['1','2']) {
        const x = +attrs['x'+n], y = +attrs['y'+n];
        points.push([a*x+c*y+e,b*x+d*y+f]);
      }
    }
  }
  return points;
}

test.each(types.filter(type => !['bus','consumer_unit','contactor','rcd','unknown','transformer_3winding'].includes(type)))('%s ANSI still meets its routed terminals', type => {
  const g = geometryFor(type);
  const expected = type==='bus_tie' ? [[-18,0],[18,0]]
    : [...(g.inputXs ?? [0]).map(x => [x,g.topY]),[0,g.bottomY]];
  const endpoints = lineEndpoints(renderSymbol(type));
  for (const [x,y] of expected) {
    expect(endpoints.some(([px,py]) => Math.abs(px-x)<1e-9 && Math.abs(py-y)<1e-9)).toBe(true);
  }
});
