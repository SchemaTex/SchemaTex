# 52 — Site Plan / Parcel Layout Standard Reference

*Presentation-grade parcel, road, and site layout diagrams for real-estate listings, client proposals, and early planning. Schematex `siteplan` draws irregular lot boundaries, building footprints, road frontage, driveways, walkways, setbacks, easements, fences, utility lines, trees, cars, dimensions, callouts, a north arrow, scale bar, and legend from a compact text DSL. It is intentionally **not** survey-grade, CAD, permit-ready, grading/drainage, or 3D.*

## 0. Positioning

`floorplan` is for interior/space layouts: rooms, walls, doors, windows, furniture. `siteplan` is for the land around the building: property lines, access, overlays, and exterior site features.

The target deliverable is the diagram a realtor, developer, planner, or sales team can paste into a listing sheet, Keynote deck, Canva page, or early proposal. The output should be clean, scaled, labeled, and editable SVG. It must not imply legal survey accuracy.

## 1. Baseline Conventions

There is no single universal rendering standard for real-estate plot sketches, but the recurring visual vocabulary is stable across municipal site-plan checklists, planning/zoning submissions, ALTA/NSPS survey drawings, and listing materials:

- Property/parcel boundary as a closed heavy polygon.
- Building/structure footprints as closed polygons.
- Roads/right-of-way and driveways as wide centerline paths. Driveways render as paved aisles with edge lines; commercial drive aisles add lane striping and directional arrows based on width.
- Setbacks, easements, fences, utility lines, and frontage as styled overlays.
- Dimensions, callouts, north arrow, scale bar, and legend as mandatory orientation aids.

Schematex follows those conventions while explicitly stopping short of bearings, metes-and-bounds legal descriptions, topographic grading, utility engineering, or permit certification.

## 2. DSL

```ebnf
plan       ::= ("siteplan"|"plotplan"|"parcelmap"|"propertymap") string? ("unit" ("ft"|"m"))? NL statement*
statement  ::= polygon | path | line | marker | dim | callout | north | scale | legend
polygon    ::= ("parcel"|"structure"|"zone"|"landscape"|"parking") id string? "points" coord coord coord+ ("fill" color)?
path       ::= ("road"|"driveway"|"walkway"|"trail") id string? (fromto | points) ("width" num)?
line       ::= ("setback"|"easement"|"fence"|"utility"|"frontage"|"boundary") id string? (fromto | points)
marker     ::= ("tree"|"car"|"pin"|"entry"|"hydrant"|"well") id? "at" coord ("size" num|dims)? ("rotate" num)? string?
dim        ::= ("dim"|"measure") string? "from" coord "to" coord
callout    ::= "callout" string "at" coord "to" coord
north      ::= "north" num?
scale      ::= "scale" num
legend     ::= "legend" ("on"|"off")
fromto     ::= "from" coord "to" coord
points     ::= "points" coord coord+
coord      ::= num "," num
dims       ::= num ("x"|"×") num
```

## 3. Core Semantics

- Coordinates are in the plan unit. Default unit is `ft` because residential plot-plan/listing prompts are commonly imperial.
- The y-axis points down, matching SVG and `floorplan`.
- Polygons are closed automatically. Point order should be clockwise or counter-clockwise; self-intersections are out of scope for v0.1.
- Paths are centerline paths with a width. Driveways `width >= 12` render lane markings; `width >= 14` also render directional arrows for commercial drive aisles.
- Line roles are presentation overlays; they do not compute compliance.
- `dim` labels are user-authored. The engine does not infer legal measurements.

## 4. Canonical Example

```text
siteplan "Residential Listing Site Plan" unit ft
parcel lot "Lot 12" points 0,0 62,0 58,96 8,104 -4,42
road maple "Maple Ave" from -12,-16 to 74,-16 width 22
frontage front from 0,0 to 62,0
setback frontSetback "Front setback" from 5,8 to 57,8
easement util "Utility easement" from 48,0 to 43,96
structure house "Residence" points 15,28 45,28 45,64 34,64 34,78 15,78
structure garage "Garage" points 45,32 58,32 58,55 45,55
driveway drive points 52,0 52,32 width 10
walkway walk points 31,0 31,28 width 4
tree oak at 9,22 size 8 "Oak"
car car1 at 52,14 size 15 rotate 0
dim "62 ft frontage" from 0,-30 to 62,-30
callout "Covered patio" at 20,90 to 22,76
north
scale 20
legend on
```

## 5. Non-Goals

- CAD construction drawings.
- Permit-ready or survey-certified plot plans.
- Bearings, monuments, legal descriptions, coordinate reference systems.
- Grading, drainage, contour lines, cut/fill calculations.
- 3D walkthroughs, photorealistic renders, GIS basemap tiles.

## 6. Canonical Test Cases

1. Residential listing site plan: irregular parcel, road frontage, front setback, utility easement, house/garage footprint, driveway, trees, car, callout, dimension.
2. Backyard landscape sketch: house/garage footprint, patio, lawn, planting beds, trees, fence, walkway, outdoor-living callouts.
3. Corner commercial site: two roads, corner parcel, retail building, parking field, entry pins, frontage line, monument sign callout.
4. Small development concept: internal road loop, multiple building footprints, landscape/open-space zones, trail/walkway, phase callouts.
