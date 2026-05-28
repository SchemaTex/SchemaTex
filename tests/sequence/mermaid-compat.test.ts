import { describe, test, expect } from "vitest";
import { parseSequence } from "../../src/diagrams/sequence/parser";
import { sequence } from "../../src/diagrams/sequence";
import type { SeqMessage } from "../../src/diagrams/sequence/types";

const msgs = (dsl: string): SeqMessage[] =>
  parseSequence(dsl).statements.filter((s): s is SeqMessage => s.kind === "message");

describe("sequence — Mermaid sequenceDiagram compatibility", () => {
  test("detect() accepts the Mermaid header", () => {
    expect(sequence.detect("sequenceDiagram\nA->>B: hi")).toBe(true);
    expect(sequence.detect('sequence "T"\nA->B: hi')).toBe(true);
  });

  test("Mermaid arrow semantics: ->> sync, -->> reply, -) async", () => {
    const m = msgs(`sequenceDiagram
Alice->>Bob: call
Bob-->>Alice: return
Alice-)Bob: fire`);
    expect(m.map((x) => x.arrow)).toEqual(["sync", "reply", "async"]);
  });

  test("native `sequence` header keeps legacy ->> = async (no regression)", () => {
    expect(msgs(`sequence "T"\nA->>B: x`)[0]!.arrow).toBe("async");
  });

  test("participants, Note over, and activation suffixes parse under Mermaid header", () => {
    const ast = parseSequence(`sequenceDiagram
participant Alice
participant Bob
Alice->>+Bob: req
Bob-->>-Alice: res
Note over Alice,Bob: handshake`);
    expect(ast.participants.map((p) => p.id)).toEqual(["Alice", "Bob"]);
    expect(ast.statements.some((s) => s.kind === "note")).toBe(true);
  });
});
