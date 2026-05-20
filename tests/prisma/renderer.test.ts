import { describe, expect, it } from "vitest";
import { renderPrisma } from "../../src/diagrams/prisma/renderer";
import { render } from "../../src/core/api";

const MINIMAL = `
prisma
mode: 2020-single
title: SR

identification:
  databases:
    n: 100
    duplicates-removed: 10

screening:
  records-screened: 90
  excluded:
    n: 60
    reasons: irrelevant=60

eligibility:
  full-text-assessed: 30
  excluded:
    n: 20
    reasons: wrong population=10, wrong outcome=10

included:
  studies: 10
`;

describe("prisma renderer", () => {
  it("produces an <svg> root with semantic classes", () => {
    const svg = renderPrisma(MINIMAL);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('class="prisma"');
    expect(svg).toContain("prisma-stage");
    expect(svg).toContain("prisma-exclusion");
    expect(svg).toContain("prisma-arrow-main");
  });

  it("renders the page title", () => {
    const svg = renderPrisma(MINIMAL);
    expect(svg).toContain("SR");
  });

  it("escapes XML-sensitive characters in counts/labels", () => {
    const dsl = MINIMAL.replace("title: SR", 'title: AT&T < cohort > 2020');
    const svg = renderPrisma(dsl);
    expect(svg).toContain("AT&amp;T &lt; cohort &gt; 2020");
  });

  it("is reachable via the top-level render() dispatcher", () => {
    const svg = render(MINIMAL);
    expect(svg).toContain("prisma");
  });
});
