import type {
  Point,
  SiteplanAst,
  SiteplanLayoutResult,
  SiteplanLegendItem,
} from "./types";

const EMPTY_BOUNDS = { minX: 0, minY: 0, maxX: 100, maxY: 70 };

function includePoint(bounds: { minX: number; minY: number; maxX: number; maxY: number }, p: Point, pad = 0): void {
  bounds.minX = Math.min(bounds.minX, p.x - pad);
  bounds.minY = Math.min(bounds.minY, p.y - pad);
  bounds.maxX = Math.max(bounds.maxX, p.x + pad);
  bounds.maxY = Math.max(bounds.maxY, p.y + pad);
}

function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function legendItems(ast: SiteplanAst): SiteplanLegendItem[] {
  const seen = new Set<string>();
  const items: SiteplanLegendItem[] = [];
  const add = (key: string, label: string): void => {
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ key, label });
  };
  for (const p of ast.polygons) add(p.role, p.role === "parcel" ? "Parcel boundary" : p.role);
  for (const p of ast.paths) add(p.role, p.role);
  for (const l of ast.lines) add(l.role, l.role);
  for (const m of ast.markers) add(m.kind, m.kind);
  return items;
}

export function layoutSiteplan(ast: SiteplanAst): SiteplanLayoutResult {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const warnings: string[] = [];

  for (const p of ast.polygons) {
    for (const pt of p.points) includePoint(bounds, pt);
    if (p.points.length >= 3 && polygonArea(p.points) < 1) {
      warnings.push(`${p.role} "${p.id}" has very small area — check point order or units`);
    }
  }
  for (const p of ast.paths) for (const pt of p.points) includePoint(bounds, pt, p.width / 2);
  for (const l of ast.lines) for (const pt of l.points) includePoint(bounds, pt, 2);
  for (const m of ast.markers) includePoint(bounds, m.at, m.size / 2);
  for (const c of ast.callouts) {
    includePoint(bounds, c.at, 8);
    includePoint(bounds, c.to);
  }
  for (const d of ast.dimensions) {
    includePoint(bounds, d.from, 5);
    includePoint(bounds, d.to, 5);
  }

  const finalBounds = Number.isFinite(bounds.minX) ? bounds : { ...EMPTY_BOUNDS };

  return {
    title: ast.title,
    unit: ast.unit,
    north: ast.north,
    scale: ast.scale,
    legend: ast.legend,
    polygons: ast.polygons,
    paths: ast.paths,
    lines: ast.lines,
    markers: ast.markers,
    callouts: ast.callouts,
    dimensions: ast.dimensions,
    bounds: finalBounds,
    warnings,
    legendItems: legendItems(ast),
  };
}

export function formatSiteLength(n: number, unit: "ft" | "m"): string {
  if (unit === "ft") return `${Math.round(n)} ft`;
  return `${Math.round(n * 10) / 10} m`;
}
