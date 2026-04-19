import type { RenderConfig } from "../../core/types";
import {
  svgRoot,
  group,
  el,
  path as pathEl,
  text as textEl,
  title as titleEl,
  desc,
  rect,
  circle,
  escapeXml,
} from "../../core/svg";
import { resolveBaseTheme, type BaseTheme } from "../../core/theme";
import { layoutOrgchart, layoutOrgchartList } from "./layout";
import type { OrgchartAST, OrgchartLayoutNode, OrgchartRoleIcon } from "./types";

function buildCss(t: BaseTheme): string {
  return `
.lt-org { background: ${t.bg}; font-family: system-ui, -apple-system, sans-serif; }
.lt-org-title { font: 500 16px sans-serif; fill: ${t.text}; }
.lt-org-card { fill: ${t.bg}; stroke: ${t.neutral}; stroke-width: 1; }
.lt-org-card-vacant { fill: ${t.bg}; stroke: ${t.warn}; stroke-width: 1; stroke-dasharray: 4,3; }
.lt-org-card-draft { fill: ${t.bg}; stroke: ${t.neutral}; stroke-width: 1; stroke-dasharray: 4,3; opacity: 0.7; }
.lt-org-card-external { fill: ${t.bg}; stroke: ${t.neutral}; stroke-width: 1; stroke-dasharray: 4,3; }
.lt-org-name { font: 500 14px sans-serif; fill: ${t.text}; }
.lt-org-title-text { font: 400 12px sans-serif; fill: ${t.textMuted}; }
.lt-org-info { font: 400 11px sans-serif; fill: ${t.textMuted}; }
.lt-org-dept { font: 500 10px sans-serif; }
.lt-org-avatar-text { font: 600 13px sans-serif; text-anchor: middle; }
.lt-org-edge { stroke: ${t.stroke}; stroke-width: 1.4; fill: none; }
.lt-org-edge-matrix { stroke: ${t.neutral}; stroke-width: 1.2; stroke-dasharray: 4,3; fill: none; }
.lt-org-edge-label-bg { fill: ${t.bg}; stroke: ${t.neutral}; stroke-width: 1; }
.lt-org-edge-label { font: 500 10px sans-serif; fill: ${t.textMuted}; text-anchor: middle; }
.lt-org-pill-bg { fill: ${t.bg}; stroke-width: 1; }
.lt-org-pill { font: 600 9px sans-serif; text-anchor: middle; letter-spacing: 0.4px; }
.lt-org-panel { fill: ${t.bg}; stroke: ${t.neutral}; stroke-width: 1; }
.lt-org-guide { stroke: ${t.neutral}; stroke-width: 1; fill: none; }
.lt-org-caret { font: 400 9px sans-serif; fill: ${t.textMuted}; }
.lt-org-row-name { font: 500 13px sans-serif; fill: ${t.text}; }
.lt-org-row-title { font: 400 12px sans-serif; fill: ${t.textMuted}; }
.lt-org-row-avatar-text { font: 600 10px sans-serif; text-anchor: middle; }
.lt-org-row-count { font: 400 11px sans-serif; fill: ${t.textMuted}; text-anchor: end; }
.lt-org-row-dept { font: 500 10px sans-serif; text-anchor: middle; }
`.trim();
}

/** Gender silhouette (head + body) centered at (0,0), ~18px tall. */
function renderGenderGlyph(gender: "male" | "female", fg: string): string {
  const f = `fill="${fg}"`;
  if (gender === "male") {
    // head + broad rectangular shoulders
    return `<circle cx="0" cy="-7" r="5.5" ${f}/><path d="M -9 11 C -9 2 -5 0 0 0 C 5 0 9 2 9 11 Z" ${f}/>`;
  }
  // female: head + tapered dress silhouette
  return `<circle cx="0" cy="-7" r="5.5" ${f}/><path d="M -5 0 C -10 5 -11 10 -10 11 L 10 11 C 11 10 10 5 5 0 Z" ${f}/>`;
}

/** Simple SVG role-icon glyph in `fg` foreground color on a tinted circle. */
function renderRoleGlyph(role: OrgchartRoleIcon, fg: string): string {
  // Approx 20x20 icon centered at (0,0)
  const stroke = `stroke="${fg}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const fillWhite = `fill="${fg}"`;
  switch (role) {
    case "CEO":
    case "VP":
      // Crown
      return `<path d="M -10 4 L -10 -6 L -4 0 L 0 -8 L 4 0 L 10 -6 L 10 4 Z" ${fillWhite} stroke="none"/>`;
    case "CTO":
    case "Engineer":
      // Gear (simplified 8-tooth)
      return `<circle r="6" ${stroke}/><circle r="2" ${fillWhite} stroke="none"/><g ${stroke}><line x1="0" y1="-9" x2="0" y2="-7"/><line x1="0" y1="9" x2="0" y2="7"/><line x1="-9" y1="0" x2="-7" y2="0"/><line x1="9" y1="0" x2="7" y2="0"/><line x1="-6.4" y1="-6.4" x2="-5" y2="-5"/><line x1="6.4" y1="-6.4" x2="5" y2="-5"/><line x1="-6.4" y1="6.4" x2="-5" y2="5"/><line x1="6.4" y1="6.4" x2="5" y2="5"/></g>`;
    case "CFO":
      // Dollar
      return `<text x="0" y="6" text-anchor="middle" font-size="18" font-weight="700" fill="${fg}">$</text>`;
    case "COO":
    case "Ops":
      // Triple gear dots
      return `<g ${fillWhite}><circle cx="-6" cy="0" r="3" stroke="none"/><circle cx="6" cy="0" r="3" stroke="none"/><circle cx="0" cy="-5" r="3" stroke="none"/></g>`;
    case "CMO":
    case "Marketing":
      // Megaphone (simplified)
      return `<path d="M -8 -4 L 2 -7 L 2 7 L -8 4 Z" ${fillWhite} stroke="none"/><path d="M 2 -4 L 8 -6 L 8 6 L 2 4 Z" ${fillWhite} stroke="none"/>`;
    case "CPO":
    case "Product":
      // Lightbulb
      return `<path d="M 0 -8 C 5 -8 7 -4 7 0 C 7 3 4 4 4 6 L -4 6 C -4 4 -7 3 -7 0 C -7 -4 -5 -8 0 -8 Z" ${fillWhite} stroke="none"/><line x1="-3" y1="9" x2="3" y2="9" stroke="${fg}" stroke-width="1.5"/>`;
    case "Designer":
      // Paint brush
      return `<path d="M -7 7 L 7 -7 L 9 -5 L -5 9 Z" ${fillWhite} stroke="none"/>`;
    case "Sales":
      // Briefcase
      return `<rect x="-8" y="-4" width="16" height="10" rx="1" ${fillWhite} stroke="none"/><rect x="-4" y="-7" width="8" height="4" ${stroke}/>`;
    case "HR":
      // Person group
      return `<circle cx="-3" cy="-4" r="3" ${fillWhite} stroke="none"/><circle cx="4" cy="-3" r="2.5" ${fillWhite} stroke="none"/><path d="M -8 7 C -8 2 -2 2 -2 2 C -2 2 2 2 2 7 Z" ${fillWhite} stroke="none"/><path d="M 0 7 C 0 4 4 4 4 4 C 4 4 9 4 9 7 Z" ${fillWhite} stroke="none"/>`;
    case "Legal":
      // Balance / scale
      return `<line x1="0" y1="-8" x2="0" y2="8" stroke="${fg}" stroke-width="1.6"/><line x1="-7" y1="-6" x2="7" y2="-6" stroke="${fg}" stroke-width="1.6"/><path d="M -9 0 L -5 -6 L -1 0 Z" ${fillWhite} stroke="none"/><path d="M 1 0 L 5 -6 L 9 0 Z" ${fillWhite} stroke="none"/>`;
    case "Data":
      // Bar chart
      return `<g ${fillWhite}><rect x="-8" y="0" width="4" height="7" stroke="none"/><rect x="-2" y="-4" width="4" height="11" stroke="none"/><rect x="4" y="-7" width="4" height="14" stroke="none"/></g>`;
    case "Advisor":
      // Star
      return `<path d="M 0 -9 L 2.6 -2.7 L 9 -2 L 4 2.3 L 5.3 8.5 L 0 5 L -5.3 8.5 L -4 2.3 L -9 -2 L -2.6 -2.7 Z" ${fillWhite} stroke="none"/>`;
    case "Intern":
      // Graduation cap
      return `<path d="M -10 -2 L 0 -7 L 10 -2 L 0 3 Z" ${fillWhite} stroke="none"/><path d="M -5 0 L -5 5 C -5 7 5 7 5 5 L 5 0" ${stroke}/>`;
    case "Vacant":
      return `<circle r="7" stroke="${fg}" stroke-width="1.4" fill="none" stroke-dasharray="3,2"/><text x="0" y="4" text-anchor="middle" font-size="12" font-weight="700" fill="${fg}">?</text>`;
    default:
      return "";
  }
}

function renderAvatar(ln: OrgchartLayoutNode): string {
  const role = ln.node.role;
  const cx = -ln.width / 2 + 14 + 18;
  const cy = 0;
  const r = 18;
  const parts: string[] = [
    circle({ cx, cy, r, fill: ln.avatarBg, stroke: "none" }),
  ];
  if (role && role !== "Vacant") {
    parts.push(
      group({ transform: `translate(${cx}, ${cy})` }, [
        renderRoleGlyph(role, ln.avatarFg),
      ])
    );
  } else if (ln.node.open) {
    parts.push(
      group({ transform: `translate(${cx}, ${cy})` }, [
        renderRoleGlyph("Vacant", ln.avatarFg),
      ])
    );
  } else if (ln.node.gender) {
    parts.push(
      group({ transform: `translate(${cx}, ${cy})` }, [
        renderGenderGlyph(ln.node.gender, ln.avatarFg),
      ])
    );
  } else {
    parts.push(
      textEl(
        { x: cx, y: cy + 5, class: "lt-org-avatar-text", fill: ln.avatarFg },
        ln.initials
      )
    );
  }
  return group({}, parts);
}

function renderCardBody(ln: OrgchartLayoutNode, t: BaseTheme): string {
  const n = ln.node;
  const x = -ln.width / 2;
  const y = -ln.height / 2;

  let cardClass = "lt-org-card";
  if (n.open) cardClass = "lt-org-card-vacant";
  else if (n.draft) cardClass = "lt-org-card-draft";
  else if (n.external) cardClass = "lt-org-card-external";

  const parts: string[] = [];
  parts.push(
    rect({
      x,
      y,
      width: ln.width,
      height: ln.height,
      rx: 10,
      ry: 10,
      class: cardClass,
    })
  );

  parts.push(renderAvatar(ln));

  // Text block to the right of avatar. Name + title only; department is conveyed by avatar color.
  const textX = x + 14 + 36 + 12;
  const hasTitle = !!n.title;

  const hasInfo = !!n.info;
  const displayName = n.open && !n.name ? "Open Role" : n.name;

  // Vertical layout: name → title → info, centered in card
  // Anchor row count determines nameY offset
  const lineCount = 1 + (hasTitle ? 1 : 0) + (hasInfo ? 1 : 0);
  const lineH = 16;
  let nameY = -(lineCount - 1) * lineH / 2;

  parts.push(textEl({ x: textX, y: nameY, class: "lt-org-name" }, displayName));
  if (hasTitle) {
    parts.push(textEl({ x: textX, y: nameY + lineH, class: "lt-org-title-text" }, n.title!));
  }
  if (hasInfo) {
    parts.push(
      textEl(
        { x: textX, y: nameY + lineH * (hasTitle ? 2 : 1), class: "lt-org-info" },
        n.info!
      )
    );
  }

  // Status / hiring pill (top-right corner)
  const pillLabel =
    n.open
      ? "HIRING"
      : n.status === "new"
      ? "NEW"
      : n.status === "leaving"
      ? "LEAVING"
      : n.status === "on-leave"
      ? "ON LEAVE"
      : undefined;
  if (pillLabel) {
    const pw = pillLabel.length * 5.8 + 10;
    const ph = 14;
    const px = ln.width / 2 - pw - 8;
    const py = y + 8;
    const pillFg =
      pillLabel === "HIRING"
        ? "#8a6d00"
        : pillLabel === "NEW"
        ? "#2b6a3a"
        : pillLabel === "LEAVING"
        ? "#8a3b1a"
        : t.textMuted;
    const pillBg =
      pillLabel === "HIRING"
        ? "#fef3c7"
        : pillLabel === "NEW"
        ? "#dcfce7"
        : pillLabel === "LEAVING"
        ? "#fee4d8"
        : "#eeeeea";
    parts.push(
      rect({ x: px, y: py, width: pw, height: ph, rx: 3, fill: pillBg, stroke: "none" })
    );
    parts.push(
      textEl(
        { x: px + pw / 2, y: py + ph - 4, class: "lt-org-pill", fill: pillFg },
        pillLabel
      )
    );
  }

  return group(
    {
      transform: `translate(${ln.x}, ${ln.y + ln.height / 2})`,
      "data-person-id": n.id,
      "data-department": n.department ?? "",
      "data-role": n.role ?? "",
    },
    parts
  );
}

function renderListRow(ln: OrgchartLayoutNode): string {
  const n = ln.node;
  const rowCenterY = ln.y + ln.height / 2;
  const caretX = ln.x;
  const avatarCx = ln.x + 20;
  const avatarR = 11;
  const parts: string[] = [];

  // Caret
  const caret = ln.hasChildren ? "▼" : "·";
  parts.push(
    textEl(
      { x: caretX, y: rowCenterY + 3, class: "lt-org-caret" },
      caret
    )
  );

  // Avatar
  parts.push(circle({ cx: avatarCx, cy: rowCenterY, r: avatarR, fill: ln.avatarBg, stroke: "none" }));
  if (n.role && n.role !== "Vacant") {
    parts.push(
      group({ transform: `translate(${avatarCx}, ${rowCenterY}) scale(0.58)` }, [
        renderRoleGlyph(n.role, ln.avatarFg),
      ])
    );
  } else if (n.open) {
    parts.push(
      group({ transform: `translate(${avatarCx}, ${rowCenterY}) scale(0.58)` }, [
        renderRoleGlyph("Vacant", ln.avatarFg),
      ])
    );
  } else if (n.gender) {
    parts.push(
      group({ transform: `translate(${avatarCx}, ${rowCenterY}) scale(0.56)` }, [
        renderGenderGlyph(n.gender, ln.avatarFg),
      ])
    );
  } else {
    parts.push(
      textEl(
        {
          x: avatarCx,
          y: rowCenterY + 3,
          class: "lt-org-row-avatar-text",
          fill: ln.avatarFg,
        },
        ln.initials
      )
    );
  }

  // Name + title
  const textY = rowCenterY + 4;
  const nameX = avatarCx + avatarR + 10;
  const displayName = n.open && !n.name ? "Open Role" : n.name;
  parts.push(textEl({ x: nameX, y: textY, class: "lt-org-row-name" }, displayName));
  if (n.title) {
    const titleX = nameX + Math.max(80, displayName.length * 8 + 10);
    parts.push(textEl({ x: titleX, y: textY, class: "lt-org-row-title" }, n.title));
  }

  // Right side: dept pill + report count (only if root has many)
  const rightEdge = ln.x + ln.width;
  let cursor = rightEdge;
  if (ln.subtreeSize && ln.subtreeSize > 0) {
    const countLabel = ln.depth === 0 ? `${ln.subtreeSize} reports` : `${ln.subtreeSize}`;
    parts.push(
      textEl(
        { x: cursor, y: textY, class: "lt-org-row-count" },
        countLabel
      )
    );
    cursor -= Math.max(30, countLabel.length * 6.5) + 12;
  }
  if (n.department) {
    const pw = n.department.length * 5.6 + 14;
    const ph = 16;
    const px = cursor - pw;
    const py = rowCenterY - ph / 2;
    parts.push(
      rect({ x: px, y: py, width: pw, height: ph, rx: 3, fill: ln.avatarBg, stroke: "none" })
    );
    parts.push(
      textEl(
        {
          x: px + pw / 2,
          y: textY,
          class: "lt-org-row-dept",
          fill: ln.avatarFg,
        },
        n.department
      )
    );
  }

  return group({ "data-person-id": n.id }, parts);
}

function renderOrgchartList(
  ast: OrgchartAST,
  layout: ReturnType<typeof layoutOrgchartList>,
  t: BaseTheme
): string {
  const titleOffset = ast.title ? 42 : 16;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Organizational Directory"));
  children.push(
    desc(
      `Organizational directory with ${ast.nodes.length} people and ${ast.edges.length} reporting relationships`
    )
  );
  children.push(el("style", {}, buildCss(t)));

  if (ast.title) {
    children.push(textEl({ x: 20, y: 24, class: "lt-org-title" }, ast.title));
  }

  const inner: string[] = [];

  // Guide lines
  for (const g of layout.guides ?? []) {
    inner.push(pathEl({ d: g, class: "lt-org-guide" }));
  }

  // Rows
  for (const ln of layout.nodes) {
    inner.push(renderListRow(ln));
  }

  children.push(group({ transform: `translate(0, ${titleOffset})` }, inner));

  return svgRoot(
    {
      class: "lt-org",
      role: "img",
      "aria-label": escapeXml(ast.title ?? "Organizational directory"),
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    children
  );
}

export function renderOrgchart(ast: OrgchartAST, config?: RenderConfig): string {
  const t = resolveBaseTheme(config?.theme ?? "default");
  if (ast.layout === "list") {
    return renderOrgchartList(ast, layoutOrgchartList(ast, t.palette), t);
  }
  const layout = layoutOrgchart(ast, t.palette);
  const titleOffset = ast.title ? 36 : 10;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height + titleOffset);

  const children: string[] = [];
  children.push(titleEl(ast.title ?? "Organizational Chart"));
  children.push(
    desc(
      `Organizational chart with ${ast.nodes.length} people and ${ast.edges.length} relationships`
    )
  );
  children.push(el("style", {}, buildCss(t)));

  if (ast.title) {
    children.push(textEl({ x: 20, y: 24, class: "lt-org-title" }, ast.title));
  }

  const inner: string[] = [];

  // Edges first
  for (const le of layout.edges) {
    const cls = le.edge.kind === "matrix" ? "lt-org-edge-matrix" : "lt-org-edge";
    inner.push(pathEl({ d: le.path, class: cls }));
  }
  // Matrix edge labels
  for (const le of layout.edges) {
    if (le.edge.kind !== "matrix" || !le.edge.label || le.labelX === undefined) continue;
    const w = le.edge.label.length * 6 + 12;
    const h = 16;
    const x = (le.labelX ?? 0) - w / 2;
    const y = (le.labelY ?? 0) - h / 2;
    inner.push(
      rect({ x, y, width: w, height: h, rx: 3, class: "lt-org-edge-label-bg" })
    );
    inner.push(
      textEl(
        { x: le.labelX, y: (le.labelY ?? 0) + 4, class: "lt-org-edge-label" },
        le.edge.label
      )
    );
  }

  // Cards on top
  for (const ln of layout.nodes) {
    inner.push(renderCardBody(ln, t));
  }

  children.push(group({ transform: `translate(0, ${titleOffset})` }, inner));

  return svgRoot(
    {
      class: "lt-org",
      role: "img",
      "aria-label": escapeXml(ast.title ?? "Organizational chart"),
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    children
  );
}
