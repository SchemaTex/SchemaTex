import { describe, it, expect } from "vitest";
import { parseSociogram, SociogramParseError } from "../../src/diagrams/sociogram/parser";

describe("Sociogram Parser", () => {
  describe("header", () => {
    it("parses minimal sociogram", () => {
      const ast = parseSociogram("sociogram\n");
      expect(ast.type).toBe("sociogram");
      expect(ast.title).toBeUndefined();
      expect(ast.nodes).toHaveLength(0);
      expect(ast.edges).toHaveLength(0);
    });

    it("parses sociogram with title", () => {
      const ast = parseSociogram('sociogram "My Network"\n');
      expect(ast.title).toBe("My Network");
    });

    it("throws on missing header", () => {
      expect(() => parseSociogram("not a sociogram")).toThrow(SociogramParseError);
    });
  });

  describe("config", () => {
    it("parses layout config", () => {
      const ast = parseSociogram("sociogram\n  config: layout = force-directed\n");
      expect(ast.config.layout).toBe("force-directed");
    });

    it("parses sizing config", () => {
      const ast = parseSociogram("sociogram\n  config: sizing = in-degree\n");
      expect(ast.config.sizing).toBe("in-degree");
    });

    it("parses coloring config", () => {
      const ast = parseSociogram("sociogram\n  config: coloring = group\n");
      expect(ast.config.coloring).toBe("group");
    });

    it("parses highlight config", () => {
      const ast = parseSociogram("sociogram\n  config: highlight = stars, isolates, cliques\n");
      expect(ast.config.highlight).toEqual(["stars", "isolates", "cliques"]);
    });

    it("uses defaults for unrecognized config values", () => {
      const ast = parseSociogram("sociogram\n  config: layout = unknown\n");
      expect(ast.config.layout).toBe("circular");
    });
  });

  describe("nodes", () => {
    it("parses simple node", () => {
      const ast = parseSociogram("sociogram\nalice\n");
      expect(ast.nodes).toHaveLength(1);
      expect(ast.nodes[0].id).toBe("alice");
    });

    it("parses node with label", () => {
      const ast = parseSociogram('sociogram\nalice [label: "Alice Smith"]\n');
      expect(ast.nodes[0].label).toBe("Alice Smith");
    });

    it("parses node with group property", () => {
      const ast = parseSociogram('sociogram\nalice [group: team-a]\n');
      expect(ast.nodes[0].group).toBe("team-a");
    });

    it("parses node with role", () => {
      const ast = parseSociogram('sociogram\nalice [role: star]\n');
      expect(ast.nodes[0].role).toBe("star");
    });

    it("parses node with size", () => {
      const ast = parseSociogram('sociogram\nalice [size: large]\n');
      expect(ast.nodes[0].size).toBe("large");
    });
  });

  describe("edges", () => {
    it("parses one-way positive edge", () => {
      const ast = parseSociogram("sociogram\nalice -> bob\n");
      expect(ast.edges).toHaveLength(1);
      expect(ast.edges[0].from).toBe("alice");
      expect(ast.edges[0].to).toBe("bob");
      expect(ast.edges[0].direction).toBe("one-way");
      expect(ast.edges[0].valence).toBe("positive");
    });

    it("parses mutual positive edge", () => {
      const ast = parseSociogram("sociogram\nalice <-> bob\n");
      expect(ast.edges[0].direction).toBe("mutual");
      expect(ast.edges[0].valence).toBe("positive");
    });

    it("parses undirected positive edge", () => {
      const ast = parseSociogram("sociogram\nalice -- bob\n");
      expect(ast.edges[0].direction).toBe("undirected");
      expect(ast.edges[0].valence).toBe("positive");
    });

    it("parses one-way rejection edge", () => {
      const ast = parseSociogram("sociogram\nalice -x> bob\n");
      expect(ast.edges[0].direction).toBe("one-way");
      expect(ast.edges[0].valence).toBe("negative");
    });

    it("parses mutual rejection edge", () => {
      const ast = parseSociogram("sociogram\nalice <x-> bob\n");
      expect(ast.edges[0].direction).toBe("mutual");
      expect(ast.edges[0].valence).toBe("negative");
    });

    it("parses undirected rejection edge", () => {
      const ast = parseSociogram("sociogram\nalice -x- bob\n");
      expect(ast.edges[0].direction).toBe("undirected");
      expect(ast.edges[0].valence).toBe("negative");
    });

    it("parses neutral one-way edge (-.>)", () => {
      const ast = parseSociogram("sociogram\nalice -.> bob\n");
      expect(ast.edges[0].direction).toBe("one-way");
      expect(ast.edges[0].valence).toBe("neutral");
    });

    it("parses neutral undirected edge", () => {
      const ast = parseSociogram("sociogram\nalice -.- bob\n");
      expect(ast.edges[0].direction).toBe("undirected");
      expect(ast.edges[0].valence).toBe("neutral");
    });

    it("parses strong positive edge (==>)", () => {
      const ast = parseSociogram("sociogram\nalice ==> bob\n");
      expect(ast.edges[0].direction).toBe("one-way");
      expect(ast.edges[0].valence).toBe("positive");
      expect(ast.edges[0].weight).toBe(3);
    });

    it("parses very strong mutual edge (<===>)", () => {
      const ast = parseSociogram("sociogram\nalice <===> bob\n");
      expect(ast.edges[0].direction).toBe("mutual");
      expect(ast.edges[0].valence).toBe("positive");
      expect(ast.edges[0].weight).toBe(4);
    });

    it("parses edge with label", () => {
      const ast = parseSociogram('sociogram\nalice -> bob [label: "best friend"]\n');
      expect(ast.edges[0].label).toBe("best friend");
    });

    it("parses edge with custom weight", () => {
      const ast = parseSociogram("sociogram\nalice -> bob [weight: 4]\n");
      expect(ast.edges[0].weight).toBe(4);
    });

    it("parses reverse edge (<-)", () => {
      const ast = parseSociogram("sociogram\nalice <- bob\n");
      expect(ast.edges[0].from).toBe("bob");
      expect(ast.edges[0].to).toBe("alice");
    });

    it("auto-registers nodes from edges", () => {
      const ast = parseSociogram("sociogram\nalice -> bob\n");
      expect(ast.nodes).toHaveLength(2);
      expect(ast.nodes.map((n) => n.id)).toContain("alice");
      expect(ast.nodes.map((n) => n.id)).toContain("bob");
    });
  });

  describe("groups", () => {
    it("parses group with members", () => {
      const input = `sociogram
group boys [label: "Boys"]
    tom
    jack
`;
      const ast = parseSociogram(input);
      expect(ast.groups).toHaveLength(1);
      expect(ast.groups[0].id).toBe("boys");
      expect(ast.groups[0].label).toBe("Boys");
      expect(ast.groups[0].members).toEqual(["tom", "jack"]);
    });

    it("assigns group to member nodes", () => {
      const input = `sociogram
group team [label: "Team A"]
    alice
    bob
`;
      const ast = parseSociogram(input);
      const alice = ast.nodes.find((n) => n.id === "alice");
      expect(alice?.group).toBe("team");
    });

    it("parses group with color", () => {
      const input = `sociogram
group boys [label: "Boys", color: "#42A5F5"]
    tom
`;
      const ast = parseSociogram(input);
      expect(ast.groups[0].color).toBe("#42A5F5");
    });
  });

  describe("comments and blank lines", () => {
    it("ignores comments", () => {
      const ast = parseSociogram("sociogram\n# this is a comment\nalice\n");
      expect(ast.nodes).toHaveLength(1);
    });

    it("ignores blank lines", () => {
      const ast = parseSociogram("sociogram\n\nalice\n\nbob\n");
      expect(ast.nodes).toHaveLength(2);
    });
  });

  describe("standard test cases", () => {
    it("parses Case 1: Basic Classroom Sociogram", () => {
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
      const ast = parseSociogram(input);
      expect(ast.title).toBe("Mrs. Chen's 4th Grade Class");
      expect(ast.nodes).toHaveLength(6);
      expect(ast.edges).toHaveLength(11);
    });

    it("parses Case 2: Groups and Rejection", () => {
      const input = `sociogram "Playground Dynamics"
  config: layout = force-directed
  config: highlight = stars, isolates, cliques
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
      const ast = parseSociogram(input);
      expect(ast.config.layout).toBe("force-directed");
      expect(ast.config.coloring).toBe("group");
      expect(ast.groups).toHaveLength(2);
      expect(ast.groups[0].members).toEqual(["tom", "jack", "mike", "leo"]);
      expect(ast.groups[1].members).toEqual(["anna", "beth", "chloe", "diana"]);
      expect(ast.edges).toHaveLength(10);

      const rejection = ast.edges.find((e) => e.valence === "negative");
      expect(rejection?.from).toBe("mike");
      expect(rejection?.to).toBe("leo");
    });

    it("parses Case 4: Group Therapy", () => {
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
      const ast = parseSociogram(input);
      expect(ast.config.layout).toBe("circular");
      expect(ast.nodes).toHaveLength(7);
      expect(ast.edges).toHaveLength(11);

      const therapistNode = ast.nodes.find((n) => n.id === "therapist");
      expect(therapistNode?.role).toBe("star");

      const strongBond = ast.edges.find((e) => e.label === "strong bond");
      expect(strongBond?.weight).toBe(3);
      expect(strongBond?.direction).toBe("mutual");
    });
  });
});
