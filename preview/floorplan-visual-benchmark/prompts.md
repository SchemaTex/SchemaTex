# Floorplan visual benchmark prompts

Generated with the built-in `image_gen` tool on 2026-09-03. These images are visual stimulus, not architectural ground truth.

## Compact two-bedroom apartment

```text
Use case: infographic-diagram
Asset type: visual benchmark input for evaluating a text-to-SVG floorplan engine
Primary request: Create one plausible compact two-bedroom apartment floor plan, approximately 10 m by 7.5 m overall.
Subject: orthographic top-down architectural floor plan with living/dining, open kitchen, two bedrooms, one bathroom, short entry hall, closets, realistic wall thickness, door swing arcs, exterior windows, bathroom and kitchen fixtures, beds, sofa, dining table.
Style/medium: clean professional black-and-white architectural plan drawing, crisp ink lines on white paper, no perspective, no shadows, no color.
Composition/framing: one isolated plan centered with generous white margin; horizontal landscape footprint.
Text: only simple English room names and a small set of outer dimensions in metres.
Constraints: rooms must connect plausibly; doors must not collide; furniture must fit; exterior and interior walls visibly differ in thickness; conventional architectural symbols.
Avoid: title block, logos, watermark, decorative rendering, 3D, isometric view, people, illegible dense annotations.
```

## L-shaped townhouse ground floor

```text
Use case: infographic-diagram
Asset type: visual benchmark input for evaluating a text-to-SVG floorplan engine
Primary request: Create one plausible small townhouse ground-floor plan with an L-shaped outer footprint, approximately 9 m by 8 m at maximum extents.
Subject: orthographic top-down architectural floor plan containing entry, living room, dining/kitchen, powder room, utility closet, an L-shaped or U-shaped stair with clear UP arrow and landing, rear patio doors, several exterior windows, sofa, dining table, kitchen counters.
Style/medium: clean professional black-and-white architectural plan drawing, crisp ink lines on white paper, no perspective, no shadows, no color.
Composition/framing: one isolated plan centered with generous white margin; L-shaped footprint is unmistakable.
Text: only simple English room names and a small set of outer dimensions in metres.
Constraints: realistic circulation and wall thickness; conventional door swings and stair graphics; stair handedness should be visually clear; rooms and furniture must fit.
Avoid: title block, logos, watermark, decorative rendering, 3D, isometric view, people, illegible dense annotations.
```

## 40-seat neighborhood restaurant

```text
Use case: infographic-diagram
Asset type: visual benchmark input for evaluating a text-to-SVG floorplan engine
Primary request: Create one plausible small 40-seat neighborhood restaurant floor plan, approximately 14 m by 9 m overall.
Subject: orthographic top-down architectural floor plan with entry, dining area using a mix of two-top and four-top tables plus a wall booth row, service counter, commercial kitchen, walk-in cooler, dishwashing/prep zone, two accessible restrooms, rear service exit, doors, windows, and a clear aisle from entry to exits.
Style/medium: clean professional black-and-white architectural plan drawing, crisp ink lines on white paper, no perspective, no shadows, no color.
Composition/framing: one isolated rectangular plan centered with generous white margin.
Text: only simple English zone names and a small set of outer dimensions in metres.
Constraints: furniture density must look operational; visible wall thickness; conventional door swings; clear egress route; commercial kitchen equipment symbols.
Avoid: title block, logos, watermark, decorative rendering, 3D, isometric view, people, illegible dense annotations.
```
