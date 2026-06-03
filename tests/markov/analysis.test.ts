import { describe, expect, it } from "vitest";
import { parseMarkov, MarkovParseError } from "../../src/diagrams/markov/parser";
import { analyseMarkov } from "../../src/diagrams/markov/analysis";

const close = (a: number, b: number, eps = 1e-3): boolean => Math.abs(a - b) < eps;

describe("markov analysis — stationary distribution", () => {
  it("two-state weather chain → π ≈ { Sunny: 0.833, Rainy: 0.167 }", () => {
    // P = [[0.9, 0.1], [0.5, 0.5]] → π = (5/6, 1/6).
    const ast = parseMarkov(`markov "Weather"
  Sunny -> Sunny : 0.9
  Sunny -> Rainy : 0.1
  Rainy -> Sunny : 0.5
  Rainy -> Rainy : 0.5`);
    const a = analyseMarkov(ast);
    expect(a.stationary).toBeDefined();
    expect(a.stationary!.unique).toBe(true);
    expect(close(a.stationary!.pi["Sunny"]!, 5 / 6)).toBe(true);
    expect(close(a.stationary!.pi["Rainy"]!, 1 / 6)).toBe(true);
    // π is a probability vector.
    const sum = Object.values(a.stationary!.pi).reduce((s, v) => s + v, 0);
    expect(close(sum, 1)).toBe(true);
  });

  it("three-state ergodic chain → πP = π holds", () => {
    const ast = parseMarkov(`markov "Weather3"
  Sunny  -> Sunny  : 0.6
  Sunny  -> Rainy  : 0.1
  Sunny  -> Cloudy : 0.3
  Rainy  -> Rainy  : 0.5
  Rainy  -> Cloudy : 0.5
  Cloudy -> Sunny  : 0.4
  Cloudy -> Rainy  : 0.3
  Cloudy -> Cloudy : 0.3`);
    const a = analyseMarkov(ast);
    const { pi } = a.stationary!;
    // Verify the fixed-point: π·P == π for each column.
    const order = a.order;
    for (let j = 0; j < order.length; j++) {
      let acc = 0;
      for (let i = 0; i < order.length; i++) acc += pi[order[i]!]! * a.P[i]![j]!;
      expect(close(acc, pi[order[j]!]!)).toBe(true);
    }
    expect(close(Object.values(pi).reduce((s, v) => s + v, 0), 1)).toBe(true);
  });

  it("finance bull/bear/stagnant chain → unique stationary", () => {
    const ast = parseMarkov(`markov "Finance"
  Bull     -> Bull     : 0.9
  Bull     -> Bear     : 0.075
  Bull     -> Stagnant : 0.025
  Bear     -> Bull     : 0.15
  Bear     -> Bear     : 0.8
  Bear     -> Stagnant : 0.05
  Stagnant -> Bull     : 0.25
  Stagnant -> Bear     : 0.25
  Stagnant -> Stagnant : 0.5`);
    const a = analyseMarkov(ast);
    expect(a.stationary!.unique).toBe(true);
    // Known closed form ≈ { Bull 0.625, Bear 0.3125, Stagnant 0.0625 }.
    expect(close(a.stationary!.pi["Bull"]!, 0.625, 2e-3)).toBe(true);
    expect(close(a.stationary!.pi["Bear"]!, 0.3125, 2e-3)).toBe(true);
    expect(close(a.stationary!.pi["Stagnant"]!, 0.0625, 2e-3)).toBe(true);
  });

  it("periodic 2-cycle → stationary still solved via linear fallback", () => {
    // A↔B deterministic: period 2; limiting distribution oscillates but π = (0.5,0.5).
    const ast = parseMarkov(`markov
  A -> B : 1
  B -> A : 1`);
    const a = analyseMarkov(ast);
    expect(close(a.stationary!.pi["A"]!, 0.5)).toBe(true);
    expect(close(a.stationary!.pi["B"]!, 0.5)).toBe(true);
  });
});

describe("markov analysis — state classification", () => {
  it("classifies absorbing / transient on the gambler's-ruin chain", () => {
    const ast = parseMarkov(`markov "Gambler's ruin"
  state Broke absorbing
  state One
  state Two
  state Rich  absorbing
  Broke -> Broke : 1
  One   -> Broke : 0.5
  One   -> Two   : 0.5
  Two   -> One   : 0.5
  Two   -> Rich  : 0.5
  Rich  -> Rich  : 1`);
    const a = analyseMarkov(ast);
    const c = a.classification!;
    expect(c.byState["Broke"]).toBe("absorbing");
    expect(c.byState["Rich"]).toBe("absorbing");
    expect(c.byState["One"]).toBe("transient");
    expect(c.byState["Two"]).toBe("transient");
    expect(c.absorbingStates.sort()).toEqual(["Broke", "Rich"]);
  });

  it("classifies a recurrent (non-absorbing) class + transient feeder", () => {
    // T feeds an irreducible recurrent {A,B}; T itself is transient.
    const ast = parseMarkov(`markov
  T -> A : 1
  A -> B : 1
  B -> A : 1`);
    const a = analyseMarkov(ast);
    const c = a.classification!;
    expect(c.byState["T"]).toBe("transient");
    expect(c.byState["A"]).toBe("recurrent");
    expect(c.byState["B"]).toBe("recurrent");
    expect(c.absorbingStates).toEqual([]);
  });

  it("rejects a false `absorbing` assertion", () => {
    const ast = parseMarkov(`markov
  state X absorbing
  X -> Y : 1
  Y -> X : 1`);
    expect(() => analyseMarkov(ast)).toThrow(MarkovParseError);
  });
});

describe("markov analysis — absorbing chain (fundamental matrix)", () => {
  it("gambler's ruin → B (ruin/rich) and t (expected rounds)", () => {
    // States One, Two transient; Broke, Rich absorbing. Symmetric random walk.
    const ast = parseMarkov(`markov
  state Broke absorbing
  state One
  state Two
  state Rich absorbing
  Broke -> Broke : 1
  One   -> Broke : 0.5
  One   -> Two   : 0.5
  Two   -> One   : 0.5
  Two   -> Rich  : 0.5
  Rich  -> Rich  : 1`);
    const a = analyseMarkov(ast);
    const ab = a.absorbing!;
    expect(ab.transient.sort()).toEqual(["One", "Two"]);
    expect(ab.absorbing.sort()).toEqual(["Broke", "Rich"]);

    // Index helpers.
    const ti = (id: string): number => ab.transient.indexOf(id);
    const ai = (id: string): number => ab.absorbing.indexOf(id);

    // Closed form (3-state gambler's ruin, p=0.5):
    //   P(ruin | One) = 2/3, P(rich | One) = 1/3; symmetric for Two.
    expect(close(ab.B[ti("One")]![ai("Broke")]!, 2 / 3)).toBe(true);
    expect(close(ab.B[ti("One")]![ai("Rich")]!, 1 / 3)).toBe(true);
    expect(close(ab.B[ti("Two")]![ai("Broke")]!, 1 / 3)).toBe(true);
    expect(close(ab.B[ti("Two")]![ai("Rich")]!, 2 / 3)).toBe(true);

    // Expected steps to absorption: t(One) = t(Two) = 2.
    expect(close(ab.t[ti("One")]!, 2)).toBe(true);
    expect(close(ab.t[ti("Two")]!, 2)).toBe(true);
  });

  it("drunkard's walk (5-state line) → expected steps 3,4,3 from inner states", () => {
    // Grinstead-Snell: states 0..4, 0 and 4 absorbing, p=0.5 each way.
    // Expected steps from 1,2,3 are 3,4,3 respectively.
    const ast = parseMarkov(`markov
  state S0 absorbing
  state S1
  state S2
  state S3
  state S4 absorbing
  S0 -> S0 : 1
  S1 -> S0 : 0.5
  S1 -> S2 : 0.5
  S2 -> S1 : 0.5
  S2 -> S3 : 0.5
  S3 -> S2 : 0.5
  S3 -> S4 : 0.5
  S4 -> S4 : 1`);
    const a = analyseMarkov(ast);
    const ab = a.absorbing!;
    const ti = (id: string): number => ab.transient.indexOf(id);
    expect(close(ab.t[ti("S1")]!, 3)).toBe(true);
    expect(close(ab.t[ti("S2")]!, 4)).toBe(true);
    expect(close(ab.t[ti("S3")]!, 3)).toBe(true);
  });
});

describe("markov analysis — row-sum policy", () => {
  it("hard-errors when a row does not sum to 1", () => {
    const ast = parseMarkov(`markov
  A -> A : 0.6
  A -> B : 0.3
  B -> B : 1`);
    expect(() => analyseMarkov(ast)).toThrow(/sum to 0.9/);
  });

  it("normalises rows when normalize: true", () => {
    const ast = parseMarkov(`markov
  normalize: true
  A -> A : 0.6
  A -> B : 0.2
  B -> A : 1`);
    const a = analyseMarkov(ast);
    // Row A normalised from 0.8 → divide by 0.8: P[A][A]=0.75, P[A][B]=0.25.
    expect(close(a.P[0]![0]!, 0.75)).toBe(true);
    expect(close(a.P[0]![1]!, 0.25)).toBe(true);
  });
});

describe("markov analysis — reducible chain", () => {
  it("reports per-class π when there are two recurrent classes", () => {
    // Two disjoint absorbing-ish recurrent classes reachable from a transient feeder.
    const ast = parseMarkov(`markov
  Start -> A : 0.5
  Start -> C : 0.5
  A -> B : 1
  B -> A : 1
  C -> D : 1
  D -> C : 1`);
    const a = analyseMarkov(ast);
    expect(a.stationary!.unique).toBe(false);
    expect(a.stationary!.perClass).toHaveLength(2);
    for (const pc of a.stationary!.perClass) {
      const sum = Object.values(pc.pi).reduce((s, v) => s + v, 0);
      expect(close(sum, 1)).toBe(true);
    }
  });
});
