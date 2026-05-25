import { describe, test, expect } from "vitest";
import { parseFlowchart } from "../../src/diagrams/flowchart/parser";
import { renderFlowchart } from "../../src/diagrams/flowchart/renderer";
import { resolveIconName, renderIcon, iconNames } from "../../src/diagrams/flowchart/icons";

// ─── B-5: flowchart built-in node icons ────────────────────────

describe("icon parsing", () => {
  test("`icon A: server` attaches an icon to node A", () => {
    const ast = parseFlowchart(`flowchart TD\n  A[Web]\n  icon A: server`);
    const a = ast.nodes.find((n) => n.id === "A")!;
    expect(a.icon).toBe("server");
    expect(a.label).toBe("Web");
  });

  test("`icon A server` (no colon) also works", () => {
    const ast = parseFlowchart(`flowchart TD\n  A[Web]\n  icon A server`);
    expect(ast.nodes.find((n) => n.id === "A")!.icon).toBe("server");
  });

  test("icon statement creates the node if it doesn't exist yet", () => {
    const ast = parseFlowchart(`flowchart TD\n  icon DB: database\n  A --> DB`);
    expect(ast.nodes.find((n) => n.id === "DB")!.icon).toBe("database");
  });

  test("nodes without an icon statement are unaffected", () => {
    const ast = parseFlowchart(`flowchart TD\n  A[Web] --> B[API]`);
    expect(ast.nodes.every((n) => n.icon === undefined)).toBe(true);
  });
});

describe("icon catalog", () => {
  test("known icons resolve", () => {
    expect(resolveIconName("server")).toBe("server");
    expect(resolveIconName("database")).toBe("database");
  });
  test("aliases resolve to canonical names", () => {
    expect(resolveIconName("db")).toBe("database");
    expect(resolveIconName("api")).toBe("server");
    expect(resolveIconName("settings")).toBe("gear");
  });
  test("unknown names do not resolve but renderIcon still returns a fallback", () => {
    expect(resolveIconName("nonsense")).toBeUndefined();
    expect(renderIcon("nonsense").length).toBeGreaterThan(0);
  });

  test("the expanded catalog covers all four tiers", () => {
    const names = iconNames();
    expect(names.length).toBeGreaterThanOrEqual(70);
    // representative icons from each tier
    for (const n of ["folder", "code", "users", "heart", "scale", "bolt", "bank", "gear"]) {
      expect(names).toContain(n);
    }
  });

  test("every catalog icon renders non-empty SVG markup", () => {
    for (const n of iconNames()) {
      const svg = renderIcon(n);
      expect(svg.length, `icon ${n}`).toBeGreaterThan(0);
      expect(svg, `icon ${n}`).toContain("sx-fc-icon");
    }
  });

  test("domain + flow aliases resolve to canonical names", () => {
    expect(resolveIconName("hospital")).toBe("cross");
    expect(resolveIconName("justice")).toBe("scale");
    expect(resolveIconName("power")).toBe("bolt");
    expect(resolveIconName("deploy")).toBe("rocket");
    expect(resolveIconName("team")).toBe("users");
  });
});

describe("icon rendering", () => {
  test("an icon node renders the icon glyph + keeps its label", () => {
    const svg = renderFlowchart(`flowchart TD\n  A[Web Server]\n  icon A: server`);
    expect(svg).toContain("sx-fc-icon");
    expect(svg).toContain("Web Server");
  });

  test("a flowchart with no icons emits no icon glyph elements", () => {
    const svg = renderFlowchart(`flowchart TD\n  A[Web] --> B[API]`);
    // the CSS rule for the class is always present; no glyph element should be
    expect(svg).not.toMatch(/<(path|rect|circle|ellipse)[^>]*class="sx-fc-icon"/);
  });

  test("icon node is taller than the same node without an icon", () => {
    const withIcon = renderFlowchart(`flowchart TD\n  A[X]\n  icon A: server`);
    const without = renderFlowchart(`flowchart TD\n  A[X]`);
    const h = (svg: string) => Number(svg.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)?.[1] ?? 0);
    expect(h(withIcon)).toBeGreaterThan(h(without));
  });
});
