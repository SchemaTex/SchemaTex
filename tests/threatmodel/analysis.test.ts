import { describe, expect, it } from "vitest";
import { parseThreatModel } from "../../src/diagrams/threatmodel/parser";
import {
  analyseThreatModel,
  strideForNode,
  isLogStore,
} from "../../src/diagrams/threatmodel/analysis";
import type { DfdNode } from "../../src/diagrams/threatmodel/types";

const mk = (kind: DfdNode["kind"], id: string, label = id, logStore?: boolean): DfdNode => ({
  id,
  kind,
  label,
  line: 1,
  ...(logStore ? { logStore } : {}),
});

describe("STRIDE-per-element mapping", () => {
  it("External entity → S, R", () => {
    expect(strideForNode(mk("external", "U")).categories).toEqual(["S", "R"]);
  });

  it("Process → all six S,T,R,I,D,E", () => {
    expect(strideForNode(mk("process", "P")).categories).toEqual([
      "S",
      "T",
      "R",
      "I",
      "D",
      "E",
    ]);
  });

  it("Plain data store → T, I, D (no R)", () => {
    const s = strideForNode(mk("store", "D1", "User DB"));
    expect(s.categories).toEqual(["T", "I", "D"]);
    expect(s.conditionalR).toBe(false);
  });

  it("Log/audit data store → T, R, I, D (conditional R, in canonical order)", () => {
    const s = strideForNode(mk("store", "D2", "Audit Log"));
    expect(s.categories).toEqual(["T", "R", "I", "D"]);
    expect(s.conditionalR).toBe(true);
  });

  it("explicit log hint enables R even when the name does not match", () => {
    const s = strideForNode(mk("store", "D3", "Events Bucket", true));
    expect(s.categories).toContain("R");
    expect(s.conditionalR).toBe(true);
  });

  it("isLogStore matches log/audit/journal/ledger by name", () => {
    expect(isLogStore(mk("store", "D", "Transaction Journal"))).toBe(true);
    expect(isLogStore(mk("store", "D", "Immutable Ledger"))).toBe(true);
    expect(isLogStore(mk("store", "D", "Session Store"))).toBe(false);
  });

  it("data flows carry T, I, D in the analysis", () => {
    const ast = parseThreatModel(
      `stride\nexternal U: u\nprocess P: s\nU -> P : Req`
    );
    const a = analyseThreatModel(ast);
    expect(a.flows[0]!.categories).toEqual(["T", "I", "D"]);
  });
});

describe("trust-boundary-crossing detection", () => {
  const WEBAPP = `threatmodel "Web App"
external: User
process 1.1: Web Server
process 1.2: Auth Service
datastore D1: User DB
datastore D2: Audit Log
User -> 1.1 : HTTPS Request
1.1 -> 1.2 : Credentials
1.2 -> D1 : Lookup
1.2 -> D2 : Auth Event
boundary "Internet" { User }
boundary "DMZ" { 1.1, 1.2 }
boundary "Internal" { D1, D2 }`;

  it("flags exactly the flows whose endpoints sit in different zones", () => {
    const a = analyseThreatModel(parseThreatModel(WEBAPP));
    const crossing = a.crossings.map((f) => `${f.source}->${f.target}`).sort();
    // User(Internet)->1.1(DMZ) crosses; 1.1->1.2 both DMZ (no); 1.2(DMZ)->D1(Internal) crosses; 1.2->D2 crosses.
    expect(crossing).toEqual(["1.2->D1", "1.2->D2", "User->1.1"]);
  });

  it("records source and target zones on each flow", () => {
    const a = analyseThreatModel(parseThreatModel(WEBAPP));
    const userFlow = a.flows.find((f) => f.source === "User")!;
    expect(userFlow.sourceZone).toBe("Internet");
    expect(userFlow.targetZone).toBe("DMZ");
    expect(userFlow.crossesBoundary).toBe(true);

    const internal = a.flows.find((f) => f.source === "1.1" && f.target === "1.2")!;
    expect(internal.sourceZone).toBe("DMZ");
    expect(internal.targetZone).toBe("DMZ");
    expect(internal.crossesBoundary).toBe(false);
  });

  it("treats two nodes outside all boundaries as the same (untrusted) zone", () => {
    const a = analyseThreatModel(
      parseThreatModel(`stride\nexternal U: u\nprocess P: s\nU -> P : Req`)
    );
    expect(a.crossings).toHaveLength(0);
    expect(a.flows[0]!.sourceZone).toBeNull();
    expect(a.flows[0]!.targetZone).toBeNull();
  });

  it("a node in a boundary vs a node outside it is a crossing", () => {
    const a = analyseThreatModel(
      parseThreatModel(
        `stride\nexternal U: u\nprocess P: s\nU -> P : Req\nboundary "Z" { P }`
      )
    );
    expect(a.crossings.map((f) => `${f.source}->${f.target}`)).toEqual([
      "U->P",
    ]);
  });
});

describe("threat-candidate enumeration", () => {
  it("orders boundary-crossing flow candidates first", () => {
    const a = analyseThreatModel(
      parseThreatModel(
        `stride\nexternal U: u\nprocess P: s\nU -> P : Req\nboundary "Z" { P }`
      )
    );
    expect(a.candidates[0]!.onCrossing).toBe(true);
    // The boundary-crossing flow yields T, I, D candidates up front.
    expect(a.candidates.slice(0, 3).map((c) => c.category)).toEqual([
      "T",
      "I",
      "D",
    ]);
  });

  it("emits a candidate for every applicable (element, category) pair", () => {
    const a = analyseThreatModel(
      parseThreatModel(`stride\nexternal U: u\nprocess P: s\nU -> P : Req`)
    );
    // Flow T,I,D (3) + External S,R (2) + Process S,T,R,I,D,E (6) = 11.
    expect(a.candidates).toHaveLength(11);
  });
});
