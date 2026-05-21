import { describe, expect, it } from "vitest";
import { parseSequence, SequenceParseError } from "../../src/diagrams/sequence/parser";
import type { SeqFragment, SeqMessage, SeqNote } from "../../src/diagrams/sequence/types";

describe("sequence parser — participants", () => {
  it("auto-declares participants in first-use order", () => {
    const ast = parseSequence(`sequence
  Alice -> Bob : Authentication Request
  Bob --> Alice : Authentication Response`);
    expect(ast.participants.map((p) => p.id)).toEqual(["Alice", "Bob"]);
    expect(ast.participants.every((p) => p.kind === "participant")).toBe(true);
  });

  it("honors explicit kinds and `as` aliases", () => {
    const ast = parseSequence(`sequence
  actor User
  participant Web as "Web App"
  control Auth
  database DB
  User -> Web : go`);
    const web = ast.participants.find((p) => p.id === "Web")!;
    expect(web.name).toBe("Web App");
    expect(ast.participants.find((p) => p.id === "User")!.kind).toBe("actor");
    expect(ast.participants.find((p) => p.id === "Auth")!.kind).toBe("control");
    expect(ast.participants.find((p) => p.id === "DB")!.kind).toBe("database");
  });

  it("declares participants before the first message regardless of message order", () => {
    const ast = parseSequence(`sequence
  participant Server
  participant Client
  Client -> Server : hi`);
    expect(ast.participants.map((p) => p.id)).toEqual(["Server", "Client"]);
  });
});

describe("sequence parser — messages", () => {
  it("maps arrow tokens to UML semantics", () => {
    const ast = parseSequence(`sequence
  A -> B : sync
  A ->> B : async
  A --> B : reply`);
    const msgs = ast.statements.filter((s): s is SeqMessage => s.kind === "message");
    expect(msgs.map((m) => m.arrow)).toEqual(["sync", "async", "reply"]);
    expect(msgs[0]!.label).toBe("sync");
  });

  it("parses activation +/- suffixes", () => {
    const ast = parseSequence(`sequence
  A ->+ B : open
  B -->- A : close`);
    const msgs = ast.statements.filter((s): s is SeqMessage => s.kind === "message");
    expect(msgs[0]!.activateTarget).toBe(true);
    expect(msgs[1]!.deactivateSource).toBe(true);
  });

  it("tolerates missing whitespace around arrows", () => {
    const ast = parseSequence(`sequence
  A->B:hi`);
    const m = ast.statements[0] as SeqMessage;
    expect(m.from).toBe("A");
    expect(m.to).toBe("B");
    expect(m.label).toBe("hi");
  });

  it("parses create / lost / found messages", () => {
    const ast = parseSequence(`sequence
  participant Factory
  Factory -> *Worker : new
  o-> Worker : trigger
  Worker -x : fire-and-forget`);
    const msgs = ast.statements.filter((s): s is SeqMessage => s.kind === "message");
    expect(msgs[0]!.create).toBe(true);
    expect(msgs[0]!.to).toBe("Worker");
    expect(msgs[1]!.arrow).toBe("found");
    expect(msgs[1]!.from).toBe("");
    expect(msgs[2]!.arrow).toBe("lost");
    expect(msgs[2]!.to).toBe("");
    // Worker is created inline
    expect(ast.participants.find((p) => p.id === "Worker")!.createdInline).toBe(true);
  });
});

describe("sequence parser — fragments", () => {
  it("parses alt/else into operands with guards", () => {
    const ast = parseSequence(`sequence
  User -> API : req
  alt [authorized]
    API --> User : 200
  else [forbidden]
    API --> User : 403
  end`);
    const frag = ast.statements.find((s): s is SeqFragment => s.kind === "fragment")!;
    expect(frag.op).toBe("alt");
    expect(frag.operands).toHaveLength(2);
    expect(frag.operands[0]!.guard).toBe("authorized");
    expect(frag.operands[1]!.guard).toBe("forbidden");
    expect(frag.operands[0]!.statements).toHaveLength(1);
  });

  it("nests fragments", () => {
    const ast = parseSequence(`sequence
  loop [more]
    A -> B : poll
    opt [present]
      B -> C : process
    end
  end`);
    const loop = ast.statements.find((s): s is SeqFragment => s.kind === "fragment")!;
    expect(loop.op).toBe("loop");
    const inner = loop.operands[0]!.statements.find(
      (s): s is SeqFragment => s.kind === "fragment",
    )!;
    expect(inner.op).toBe("opt");
    expect(inner.operands[0]!.statements).toHaveLength(1);
  });

  it("parses par with `and` operands", () => {
    const ast = parseSequence(`sequence
  par
    A -> B : x
  and
    A -> C : y
  end`);
    const frag = ast.statements.find((s): s is SeqFragment => s.kind === "fragment")!;
    expect(frag.op).toBe("par");
    expect(frag.operands).toHaveLength(2);
  });

  it("parses the analytical operators neg / assert", () => {
    const neg = parseSequence(`sequence
  neg
    A -> B : invalid
  end`).statements.find((s): s is SeqFragment => s.kind === "fragment")!;
    expect(neg.op).toBe("neg");
    expect(neg.operands).toHaveLength(1);

    const assert = parseSequence(`sequence
  assert
    A -> B : must happen
  end`).statements.find((s): s is SeqFragment => s.kind === "fragment")!;
    expect(assert.op).toBe("assert");
  });

  it("parses ignore/consider with a {message set}", () => {
    const ig = parseSequence(`sequence
  ignore {heartbeat, log}
    A -> B : work
  end`).statements.find((s): s is SeqFragment => s.kind === "fragment")!;
    expect(ig.op).toBe("ignore");
    expect(ig.messageSet).toEqual(["heartbeat", "log"]);

    const co = parseSequence(`sequence
  consider {commit, rollback}
    A -> B : tx
  end`).statements.find((s): s is SeqFragment => s.kind === "fragment")!;
    expect(co.op).toBe("consider");
    expect(co.messageSet).toEqual(["commit", "rollback"]);
  });

  it("rejects `else` inside neg (single-operand operator)", () => {
    expect(() => parseSequence(`sequence
  neg
    A -> B : x
  else
    A -> B : y
  end`)).toThrow();
  });
});

describe("sequence parser — notes, ref, dividers", () => {
  it("parses note placements and spanning notes", () => {
    const ast = parseSequence(`sequence
  A -> B : x
  note over A : single
  note over A, B : spanning
  note left of A : aside`);
    const notes = ast.statements.filter((s): s is SeqNote => s.kind === "note");
    expect(notes[0]!.placement).toBe("over");
    expect(notes[0]!.ids).toEqual(["A"]);
    expect(notes[1]!.ids).toEqual(["A", "B"]);
    expect(notes[2]!.placement).toBe("left");
  });

  it("parses ref interaction-use frames", () => {
    const ast = parseSequence(`sequence
  ref over A, B : Establish session`);
    const ref = ast.statements[0];
    expect(ref!.kind).toBe("ref");
    if (ref!.kind === "ref") {
      expect(ref.ids).toEqual(["A", "B"]);
      expect(ref.text).toBe("Establish session");
    }
  });

  it("parses dividers and destroy", () => {
    const ast = parseSequence(`sequence
  == Phase 2 ==
  destroy Worker`);
    expect(ast.statements[0]!.kind).toBe("divider");
    expect(ast.statements[1]!.kind).toBe("destroy");
  });
});

describe("sequence parser — AI-friendliness", () => {
  it("accepts CJK quotes for labels", () => {
    const ast = parseSequence(`sequence
  participant 服务 as 「订单服务」
  用户 -> 服务 : 下单`);
    expect(ast.participants.find((p) => p.id === "服务")!.name).toBe("订单服务");
  });

  it("parses a custom stereotype in both « » and << >> forms", () => {
    const ast = parseSequence(`sequence
  actor Printer «system»
  participant Bus as "Event Bus" <<service>>
  Printer -> Bus : emit`);
    expect(ast.participants.find((p) => p.id === "Printer")!.stereotype).toBe("system");
    const bus = ast.participants.find((p) => p.id === "Bus")!;
    expect(bus.stereotype).toBe("service");
    expect(bus.name).toBe("Event Bus");
  });

  it("captures a title from the header", () => {
    const ast = parseSequence(`sequence "Login flow"
  A -> B : x`);
    expect(ast.title).toBe("Login flow");
  });

  it("parses autonumber", () => {
    const ast = parseSequence(`sequence
  autonumber 10 5
  A -> B : x`);
    expect(ast.autonumber).toEqual({ start: 10, step: 5 });
  });
});

describe("sequence parser — errors", () => {
  it("throws on `end` without an open fragment", () => {
    expect(() => parseSequence(`sequence
  A -> B : x
  end`)).toThrow(SequenceParseError);
  });

  it("throws on `else` outside an alt", () => {
    expect(() => parseSequence(`sequence
  loop [x]
    A -> B : y
  else
    A -> B : z
  end`)).toThrow(SequenceParseError);
  });

  it("throws on an unterminated fragment", () => {
    expect(() => parseSequence(`sequence
  alt [x]
    A -> B : y`)).toThrow(SequenceParseError);
  });
});
