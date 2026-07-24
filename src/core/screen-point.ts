/** Convert screen coordinates through the SVG's full ancestor transform chain. */
export function pointInSvg(
  svg: Pick<SVGSVGElement, "createSVGPoint" | "getScreenCTM">,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const mapped = point.matrixTransform(matrix.inverse());
  return { x: mapped.x, y: mapped.y };
}
