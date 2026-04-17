import { describe, it, expect } from "vitest";
import { parseSociogram } from "../../src/diagrams/sociogram/parser";
import { layoutSociogram } from "../../src/diagrams/sociogram/layout";
import { renderSociogram } from "../../src/diagrams/sociogram/renderer";

function renderFromText(text: string): string {
  const ast = parseSociogram(text);
  const layout = layoutSociogram(ast);
  return renderSociogram(layout);
}

describe("Sociogram Renderer", () => {
  describe("SVG structure", () => {
    it("produces valid SVG root element", () => {
      const svg = renderFromText("sociogram\nalice\nbob\nalice -> bob\n");
      expect(svg).toMatch(/^<svg/);
      expect(svg).toMatch(/<\/svg>$/);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it("includes viewBox", () => {
      const svg = renderFromText("sociogram\nalice\n");
      expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
    });

    it("includes class lineage-sociogram", () => {
      const svg = renderFromText("sociogram\nalice\n");
      expect(svg).toContain("lineage-sociogram");
    });
  });

  describe("accessibility", () => {
    it("includes title element", () => {
      const svg = renderFromText('sociogram "Test"\nalice\n');
      expect(svg).toContain("<title>Sociogram: Test</title>");
    });

    it("includes desc element with counts", () => {
      const svg = renderFromText("sociogram\nalice\nbob\nalice -> bob\n");
      expect(svg).toContain("2 members");
      expect(svg).toContain("1 connections");
    });
  });

  describe("arrow markers", () => {
    it("includes positive arrow marker def", () => {
      const svg = renderFromText("sociogram\nalice -> bob\n");
      expect(svg).toContain('id="sociogram-arrow"');
    });

    it("includes negative arrow marker def", () => {
      const svg = renderFromText("sociogram\nalice -x> bob\n");
      expect(svg).toContain('id="sociogram-arrow-negative"');
    });

    it("includes neutral arrow marker def", () => {
      const svg = renderFromText("sociogram\nalice -.> bob\n");
      expect(svg).toContain('id="sociogram-arrow-neutral"');
    });
  });

  describe("node rendering", () => {
    it("renders circle for each node", () => {
      const svg = renderFromText("sociogram\nalice\nbob\n");
      const circleMatches = svg.match(/<circle[^/]*\/>/g) ?? [];
      expect(circleMatches.length).toBeGreaterThanOrEqual(2);
    });

    it("renders node labels", () => {
      const svg = renderFromText('sociogram\nalice [label: "Alice Smith"]\n');
      expect(svg).toContain("Alice Smith");
    });

    it("renders data-node-id attribute", () => {
      const svg = renderFromText("sociogram\nalice\n");
      expect(svg).toContain('data-node-id="alice"');
    });

    it("applies star class for star nodes", () => {
      const svg = renderFromText("sociogram\nalice [role: star]\n");
      expect(svg).toContain("lineage-sociogram-node-star");
    });

    it("applies isolate class for isolate nodes", () => {
      const svg = renderFromText("sociogram\nalice\nbob\nalice -> bob\ncarol\n");
      expect(svg).toContain("lineage-sociogram-node-isolate");
    });

    it("renders star badge polygon for star role", () => {
      const svg = renderFromText("sociogram\nalice [role: star]\n");
      expect(svg).toContain("<polygon");
    });
  });

  describe("edge rendering", () => {
    it("renders line for edge", () => {
      const svg = renderFromText("sociogram\nalice -> bob\n");
      expect(svg).toContain("<line");
      expect(svg).toContain('data-from="alice"');
      expect(svg).toContain('data-to="bob"');
    });

    it("applies positive class", () => {
      const svg = renderFromText("sociogram\nalice -> bob\n");
      expect(svg).toContain("lineage-sociogram-edge-positive");
    });

    it("applies negative class for rejection", () => {
      const svg = renderFromText("sociogram\nalice -x> bob\n");
      expect(svg).toContain("lineage-sociogram-edge-negative");
    });

    it("applies neutral class", () => {
      const svg = renderFromText("sociogram\nalice -.- bob\n");
      expect(svg).toContain("lineage-sociogram-edge-neutral");
    });

    it("renders marker-end for one-way edge", () => {
      const svg = renderFromText("sociogram\nalice -> bob\n");
      expect(svg).toContain("marker-end");
    });

    it("renders both markers for mutual edge", () => {
      const svg = renderFromText("sociogram\nalice <-> bob\n");
      expect(svg).toContain("marker-end");
      expect(svg).toContain("marker-start");
    });

    it("renders no markers for undirected edge", () => {
      const svg = renderFromText("sociogram\nalice -- bob\n");
      expect(svg).not.toContain("marker-end");
      expect(svg).not.toContain("marker-start");
    });

    it("renders edge labels", () => {
      const svg = renderFromText('sociogram\nalice -> bob [label: "best friend"]\n');
      expect(svg).toContain("best friend");
    });
  });

  describe("title", () => {
    it("renders title text when provided", () => {
      const svg = renderFromText('sociogram "My Network"\nalice\n');
      expect(svg).toContain("My Network");
      expect(svg).toContain("lineage-sociogram-title");
    });

    it("does not render title text element when absent", () => {
      const svg = renderFromText("sociogram\nalice\n");
      expect(svg).not.toMatch(/<text[^>]*class="lineage-sociogram-title"/);
    });
  });

  describe("group coloring", () => {
    it("renders group labels", () => {
      const input = `sociogram
  config: coloring = group
group boys [label: "Boys"]
    tom
    jack
`;
      const svg = renderFromText(input);
      expect(svg).toContain("Boys");
      expect(svg).toContain("lineage-sociogram-group-label");
    });
  });

  describe("CSS styles", () => {
    it("includes style block", () => {
      const svg = renderFromText("sociogram\nalice\n");
      expect(svg).toContain("<style>");
      expect(svg).toContain("lineage-sociogram-node");
    });

    it("includes valence colors in style", () => {
      const svg = renderFromText("sociogram\nalice -> bob\n");
      expect(svg).toContain("#388e3c");
      expect(svg).toContain("#d32f2f");
      expect(svg).toContain("#9e9e9e");
    });
  });

  describe("standard test cases", () => {
    it("renders Case 1: Basic Classroom Sociogram", () => {
      const input = `sociogram "Mrs. Chen's 4th Grade Class"
  alice [label: "Alice"]
  bob [label: "Bob"]
  carol [label: "Carol"]
  dave [label: "Dave"]
  eve [label: "Eve"]
  frank [label: "Frank"]
  alice -> bob
  alice -> carol
  bob -> alice
  bob -> dave
  carol -> alice
  carol -> eve
  dave -> bob
  dave -> frank
  eve -> carol
  eve -> alice
  frank -> dave
`;
      const svg = renderFromText(input);
      expect(svg).toContain("Mrs. Chen");
      expect(svg).toContain("Alice");
      expect(svg).toContain("Bob");
      expect(svg).toContain("6 members");
      expect(svg).toContain("11 connections");
    });

    it("renders Case 2: Groups and Rejection", () => {
      const input = `sociogram "Playground Dynamics"
  config: layout = force-directed
  config: coloring = group

  group boys [label: "Boys", color: "#42A5F5"]
    tom
    jack
    mike
    leo

  group girls [label: "Girls", color: "#EF5350"]
    anna
    beth
    chloe
    diana

  tom <-> jack
  tom -> mike
  jack -> leo
  mike -x> leo [label: "conflict"]
  anna <-> beth
  anna <-> chloe
  beth <-> chloe
  anna -> diana
  diana -.- tom
  leo -.- anna
`;
      const svg = renderFromText(input);
      expect(svg).toContain("Playground Dynamics");
      expect(svg).toContain("lineage-sociogram-edge-negative");
      expect(svg).toContain("conflict");
      expect(svg).toContain("Boys");
      expect(svg).toContain("Girls");
    });

    it("renders Case 4: Group Therapy (circular)", () => {
      const input = `sociogram "Group Therapy Session 5 - Trust Network"
  config: layout = circular

  therapist [label: "Dr. Park", role: star]
  james [label: "James"]
  maria [label: "Maria"]
  lee [label: "Lee"]
  sarah [label: "Sarah"]
  tom [label: "Tom"]
  nina [label: "Nina"]

  james -> therapist
  james <-> maria [weight: 3, label: "strong bond"]
  james -> lee
  maria -> therapist
  maria -> sarah
  lee -> therapist
  lee -.- nina
  sarah <-> nina
  sarah -> therapist
  tom -> therapist
  nina -> maria
`;
      const svg = renderFromText(input);
      expect(svg).toContain("Dr. Park");
      expect(svg).toContain("lineage-sociogram-node-star");
      expect(svg).toContain("strong bond");
    });
  });

  describe("render via api", () => {
    it("renders sociogram through the main render() API", async () => {
      const { render } = await import("../../src/core/api");
      const svg = render("sociogram\nalice -> bob\n");
      expect(svg).toContain("lineage-sociogram");
      expect(svg).toContain("alice");
    });
  });
});
