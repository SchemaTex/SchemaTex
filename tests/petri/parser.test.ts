import { describe, expect, it } from "vitest";
import { parsePetri, PetriParseError } from "../../src/diagrams/petri/parser";

describe("petri parser — declarations", () => {
  it("parses places, transitions, arcs and a title", () => {
    const ast = parsePetri(`petri "classic"
  place P1 *1
  place P2
  place P3 *2
  transition T1
  transition T2
  P1 -> T1
  T1 -> P2`);
    expect(ast.title).toBe("classic");
    expect(ast.places.map((p) => p.id)).toEqual(["P1", "P2", "P3"]);
    expect(ast.transitions.map((t) => t.id)).toEqual(["T1", "T2"]);
    expect(ast.places.find((p) => p.id === "P1")!.tokens).toBe(1);
    expect(ast.places.find((p) => p.id === "P3")!.tokens).toBe(2);
    expect(ast.places.find((p) => p.id === "P2")!.tokens).toBe(0);
    expect(ast.arcs).toHaveLength(2);
  });

  it("accepts token dots, tokens: and capacity, and a human label", () => {
    const ast = parsePetri(`petri
  place Buffer capacity: 3 "buffer slots"
  place Ready ••
  place Big tokens: 7`);
    const buf = ast.places.find((p) => p.id === "Buffer")!;
    expect(buf.capacity).toBe(3);
    expect(buf.label).toBe("buffer slots");
    expect(ast.places.find((p) => p.id === "Ready")!.tokens).toBe(2);
    expect(ast.places.find((p) => p.id === "Big")!.tokens).toBe(7);
  });

  it("parses transition kinds, rate, and immediate default", () => {
    const ast = parsePetri(`petri
  transition a
  transition b timed rate: 0.8
  transition c immediate`);
    expect(ast.transitions.find((t) => t.id === "a")!.kind).toBe("immediate");
    const b = ast.transitions.find((t) => t.id === "b")!;
    expect(b.kind).toBe("timed");
    expect(b.rate).toBeCloseTo(0.8);
    expect(ast.transitions.find((t) => t.id === "c")!.kind).toBe("immediate");
  });

  it("maps the four arrow tokens to arc types and weights", () => {
    const ast = parsePetri(`petri
  place P
  place Q
  transition T
  P -> T weight: 2
  T -> Q
  P -o T
  P -- T
  P => T`);
    const byPair = (from: string, to: string, type: string) =>
      ast.arcs.find((a) => a.from === from && a.to === to && a.type === type)!;
    expect(byPair("P", "T", "standard").weight).toBe(2);
    expect(byPair("P", "T", "inhibitor")).toBeTruthy();
    expect(byPair("P", "T", "read")).toBeTruthy();
    expect(byPair("P", "T", "reset")).toBeTruthy();
  });

  it("parses a compact marking line and a fire sequence", () => {
    const ast = parsePetri(`petri
  place P1
  place P2
  transition T1
  marking: P1=3, P2=1
  P1 -> T1
  T1 -> P2
  fire: T1`);
    expect(ast.places.find((p) => p.id === "P1")!.tokens).toBe(3);
    expect(ast.places.find((p) => p.id === "P2")!.tokens).toBe(1);
    expect(ast.fireSequence).toEqual(["T1"]);
  });
});

describe("petri parser — validation (AI-friendly errors)", () => {
  it("rejects a place→place arc (bipartite)", () => {
    expect(() =>
      parsePetri(`petri
  place P
  place Q
  P -> Q`),
    ).toThrow(PetriParseError);
  });

  it("rejects an inhibitor arc from a transition", () => {
    expect(() =>
      parsePetri(`petri
  place P
  transition T
  T -o P`),
    ).toThrow(/place→transition only/);
  });

  it("rejects an arc referencing an undeclared node", () => {
    expect(() =>
      parsePetri(`petri
  place P
  P -> Tmissing`),
    ).toThrow(/unknown node/);
  });

  it("rejects a duplicate id and a non-positive weight", () => {
    expect(() => parsePetri(`petri\n  place P\n  transition P`)).toThrow(/duplicate/);
    expect(() =>
      parsePetri(`petri\n  place P\n  transition T\n  P -> T weight: 0`),
    ).toThrow(/positive integer/);
  });
});
