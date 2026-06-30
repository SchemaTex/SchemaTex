/**
 * Site plan / parcel layout — AST and layout types.
 *
 * Scope: presentation-grade property/site sketches for listings, proposals,
 * and early planning. Not survey-grade, CAD, or permit-ready.
 */

export type SiteplanUnit = "ft" | "m";

export type SiteplanLineRole =
  | "setback"
  | "easement"
  | "fence"
  | "utility"
  | "frontage"
  | "dimension"
  | "boundary";

export type SiteplanPolygonRole = "parcel" | "structure" | "zone" | "landscape" | "parking";

export type SiteplanPathRole = "road" | "driveway" | "walkway" | "trail";

export type SiteplanMarkerKind = "tree" | "car" | "pin" | "entry" | "hydrant" | "well";

export interface Point {
  x: number;
  y: number;
}

export interface SiteplanPolygon {
  role: SiteplanPolygonRole;
  id: string;
  label?: string;
  points: Point[];
  fill?: string;
  line?: number;
}

export interface SiteplanPath {
  role: SiteplanPathRole;
  id: string;
  label?: string;
  points: Point[];
  width: number;
  line?: number;
}

export interface SiteplanLine {
  role: SiteplanLineRole;
  id: string;
  label?: string;
  points: Point[];
  line?: number;
}

export interface SiteplanMarker {
  kind: SiteplanMarkerKind;
  id: string;
  at: Point;
  size: number;
  label?: string;
  rotate: number;
  line?: number;
}

export interface SiteplanCallout {
  label: string;
  at: Point;
  to: Point;
  line?: number;
}

export interface SiteplanDimension {
  label: string;
  from: Point;
  to: Point;
  line?: number;
}

export interface SiteplanAst {
  type: "siteplan";
  title: string;
  unit: SiteplanUnit;
  north?: number;
  scale?: number;
  legend: boolean;
  polygons: SiteplanPolygon[];
  paths: SiteplanPath[];
  lines: SiteplanLine[];
  markers: SiteplanMarker[];
  callouts: SiteplanCallout[];
  dimensions: SiteplanDimension[];
}

export interface SiteplanLayoutPolygon extends SiteplanPolygon {}
export interface SiteplanLayoutPath extends SiteplanPath {}
export interface SiteplanLayoutLine extends SiteplanLine {}
export interface SiteplanLayoutMarker extends SiteplanMarker {}
export interface SiteplanLayoutCallout extends SiteplanCallout {}
export interface SiteplanLayoutDimension extends SiteplanDimension {}

export interface SiteplanLegendItem {
  key: string;
  label: string;
}

export interface SiteplanLayoutResult {
  title: string;
  unit: SiteplanUnit;
  north?: number;
  scale?: number;
  legend: boolean;
  polygons: SiteplanLayoutPolygon[];
  paths: SiteplanLayoutPath[];
  lines: SiteplanLayoutLine[];
  markers: SiteplanLayoutMarker[];
  callouts: SiteplanLayoutCallout[];
  dimensions: SiteplanLayoutDimension[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  warnings: string[];
  legendItems: SiteplanLegendItem[];
}
