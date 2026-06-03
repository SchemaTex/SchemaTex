import { describe, expect, it } from "vitest";
import {
  parseThreatModel,
  ThreatModelParseError,
} from "../../src/diagrams/threatmodel/parser";

const SAMPLE = `threatmodel "Web App"
external: User
process 1.1: Web Server
datastore D1: User DB
datastore D2: Audit Log
User -> 1.1 : "HTTPS Request"
1.1 -> D1 : Lookup
1.1 -> D2 : Auth Event
boundary "Internet" { User }
boundary "DMZ" { 1.1 }
boundary "Internal" { D1, D2 }`;

describe("threatmodel parser", () => {
  it("detects header and title", () => {
    const ast = parseThreatModel(SAMPLE);
    expect(ast.type).toBe("threatmodel");
    expect(ast.title).toBe("Web App");
  });

  it("accepts the `stride` header alias", () => {
    const ast = parseThreatModel(`stride\nexternal: User\nprocess P: Srv\nUser -> P : Req`);
    expect(ast.nodes.map((n) => n.id)).toEqual(["User", "P"]);
  });

  it("parses externals, processes, stores", () => {
    const ast = parseThreatModel(SAMPLE);
    const kinds = Object.fromEntries(ast.nodes.map((n) => [n.id, n.kind]));
    expect(kinds).toMatchObject({
      User: "external",
      "1.1": "process",
      D1: "store",
      D2: "store",
    });
  });

  it("derives an external id slug when none given", () => {
    const ast = parseThreatModel(`stride\nexternal: Mobile App\nprocess P: S\nMobile App -> P : x`);
    expect(ast.nodes.find((n) => n.kind === "external")!.id).toBe("Mobile_App");
  });

  it("parses flows with quoted and unquoted labels", () => {
    const ast = parseThreatModel(SAMPLE);
    const f = ast.flows.find((x) => x.source === "User");
    expect(f).toBeDefined();
    expect(f!.label).toBe("HTTPS Request");
  });

  it("expands `<->` into two directed flows", () => {
    const ast = parseThreatModel(
      `stride\nprocess A: a\nexternal B: b\nA <-> B : Sync`
    );
    const pairs = ast.flows.map((f) => `${f.source}->${f.target}`);
    expect(pairs).toContain("A->B");
    expect(pairs).toContain("B->A");
  });

  it("parses boundaries with member id lists", () => {
    const ast = parseThreatModel(SAMPLE);
    expect(ast.boundaries.map((b) => b.name)).toEqual([
      "Internet",
      "DMZ",
      "Internal",
    ]);
    expect(ast.boundaries[2]!.members).toEqual(["D1", "D2"]);
  });

  it("flags log/audit stores via the trailing hint", () => {
    const ast = parseThreatModel(
      `stride\ndatastore D9: Cache log\nprocess P: s\nP -> D9 : w`
    );
    expect(ast.nodes.find((n) => n.id === "D9")!.logStore).toBe(true);
  });

  it("rejects a flow with no label", () => {
    expect(() =>
      parseThreatModel(`stride\nexternal: U\nprocess P: s\nU -> P`)
    ).toThrow(ThreatModelParseError);
  });

  it("rejects store→store flows", () => {
    expect(() =>
      parseThreatModel(`stride\ndatastore D1: a\ndatastore D2: b\nD1 -> D2 : x`)
    ).toThrow(/data store/i);
  });

  it("rejects external→external flows", () => {
    expect(() =>
      parseThreatModel(`stride\nexternal A: a\nexternal B: b\nA -> B : x`)
    ).toThrow(/external/i);
  });

  it("rejects unknown flow endpoints", () => {
    expect(() =>
      parseThreatModel(`stride\nprocess P: s\nP -> Ghost : x`)
    ).toThrow(/unknown element/i);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      parseThreatModel(`stride\nprocess P: a\nprocess P: b`)
    ).toThrow(/Duplicate/i);
  });

  it("rejects an element in two boundaries", () => {
    expect(() =>
      parseThreatModel(
        `stride\nprocess P: s\nexternal U: u\nU -> P : x\nboundary "A" { P }\nboundary "B" { P }`
      )
    ).toThrow(/at most one trust boundary/i);
  });

  it("rejects boundary members that are not declared", () => {
    expect(() =>
      parseThreatModel(`stride\nprocess P: s\nboundary "Z" { Nope }`)
    ).toThrow(/unknown element/i);
  });

  it("requires a header keyword", () => {
    expect(() => parseThreatModel(`external: U\nprocess P: s`)).toThrow(
      ThreatModelParseError
    );
  });

  it("normalises CJK quotes in labels", () => {
    const ast = parseThreatModel(
      `stride\nexternal U: 用户\nprocess P: s\nU -> P : 「登录请求」`
    );
    expect(ast.flows[0]!.label).toBe("登录请求");
  });
});
