import { describe, expect, it } from "vitest";
import { parseSequence } from "../../src/diagrams/sequence/parser";
import { layoutSequence, SEQ_CONST } from "../../src/diagrams/sequence/layout";

describe("sequence layout — lifelines", () => {
  it("places lifelines left→right in declaration order with increasing x", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  participant A
  participant B
  participant C
  A -> B : x
  B -> C : y`),
    );
    const xs = layout.lifelines.map((l) => l.x);
    expect(layout.lifelines.map((l) => l.participant.id)).toEqual(["A", "B", "C"]);
    expect(xs[0]).toBeLessThan(xs[1]!);
    expect(xs[1]).toBeLessThan(xs[2]!);
  });

  it("widens a gap so a long message label fits between two lifelines", () => {
    const narrow = layoutSequence(
      parseSequence(`sequence
  A -> B : hi`),
    );
    const wide = layoutSequence(
      parseSequence(`sequence
  A -> B : this is a very long message label that should push columns apart`),
    );
    const narrowGap = narrow.lifelines[1]!.x - narrow.lifelines[0]!.x;
    const wideGap = wide.lifelines[1]!.x - wide.lifelines[0]!.x;
    expect(wideGap).toBeGreaterThan(narrowGap);
  });
});

describe("sequence layout — timeline", () => {
  it("assigns increasing y to consecutive messages", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  A -> B : one
  B -> A : two
  A -> B : three`),
    );
    const ys = layout.messages.map((m) => m.y);
    expect(ys[0]).toBeLessThan(ys[1]!);
    expect(ys[1]).toBeLessThan(ys[2]!);
  });

  it("reserves extra vertical space for a self message", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  A -> B : call
  B -> B : validate
  B -> A : done`),
    );
    const selfMsg = layout.messages.find((m) => m.self)!;
    expect(selfMsg).toBeDefined();
    expect(selfMsg.selfBottomY).toBeGreaterThan(selfMsg.y);
    // the message after the self-loop sits below its bottom
    const after = layout.messages[2]!;
    expect(after.y).toBeGreaterThan(selfMsg.selfBottomY!);
  });
});

describe("sequence layout — activations", () => {
  it("opens a bar on +activation and closes it on -deactivation", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  participant Client
  participant Server
  Client ->+ Server : request
  Server ->> Server : validate
  Server -->- Client : response`),
    );
    const bar = layout.activations.find((a) => a.id === "Server")!;
    expect(bar).toBeDefined();
    const first = layout.messages[0]!;
    const last = layout.messages[2]!;
    expect(bar.yTop).toBeCloseTo(first.y, 0);
    expect(bar.yBottom).toBeCloseTo(last.y, 0);
  });

  it("nests overlapping activation bars with a horizontal offset", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  participant S
  activate S
  activate S
  deactivate S
  deactivate S`),
    );
    const bars = layout.activations.filter((a) => a.id === "S");
    expect(bars).toHaveLength(2);
    const levels = bars.map((b) => b.level).sort();
    expect(levels).toEqual([0, 1]);
    const xs = bars.map((b) => b.x);
    expect(Math.abs(xs[0]! - xs[1]!)).toBeGreaterThan(0);
  });
});

describe("sequence layout — fragments", () => {
  it("frames an alt across both participating lifelines with an operand separator", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  actor User
  participant API
  User -> API : req
  alt [authorized]
    API --> User : 200
  else [forbidden]
    API --> User : 403
  end`),
    );
    expect(layout.fragments).toHaveLength(1);
    const frag = layout.fragments[0]!;
    expect(frag.op).toBe("alt");
    expect(frag.operands).toHaveLength(2);
    // first operand has no separator, second does
    expect(frag.operands[0]!.sepY).toBeUndefined();
    expect(frag.operands[1]!.sepY).toBeGreaterThan(frag.y);
    // frame spans both columns
    const userX = layout.lifelines.find((l) => l.participant.id === "User")!.x;
    const apiX = layout.lifelines.find((l) => l.participant.id === "API")!.x;
    expect(frag.x).toBeLessThan(Math.min(userX, apiX));
    expect(frag.x + frag.width).toBeGreaterThan(Math.max(userX, apiX));
  });

  it("insets a nested fragment inside its parent", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  participant A
  participant B
  participant C
  loop [more]
    A -> B : poll
    opt [present]
      B -> C : process
    end
  end`),
    );
    expect(layout.fragments).toHaveLength(2);
    const loop = layout.fragments.find((f) => f.op === "loop")!;
    const opt = layout.fragments.find((f) => f.op === "opt")!;
    expect(opt.x).toBeGreaterThan(loop.x);
    expect(opt.x + opt.width).toBeLessThan(loop.x + loop.width);
    expect(opt.y).toBeGreaterThan(loop.y);
    expect(opt.y + opt.height).toBeLessThan(loop.y + loop.height);
  });
});

describe("sequence layout — ref, create, destroy", () => {
  it("draws a ref frame spanning the named lifelines", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  participant A
  participant B
  ref over A, B : Establish session
  A -> B : go`),
    );
    expect(layout.refs).toHaveLength(1);
    const aX = layout.lifelines.find((l) => l.participant.id === "A")!.x;
    const bX = layout.lifelines.find((l) => l.participant.id === "B")!.x;
    const ref = layout.refs[0]!;
    expect(ref.x).toBeLessThan(Math.min(aX, bX));
    expect(ref.x + ref.width).toBeGreaterThan(Math.max(aX, bX));
  });

  it("draws an inline-created head below the top and a destroy ✕ at the destroy y", () => {
    const layout = layoutSequence(
      parseSequence(`sequence
  participant Factory
  Factory -> *Worker : create
  Factory -> Worker : work
  destroy Worker`),
    );
    const worker = layout.lifelines.find((l) => l.participant.id === "Worker")!;
    const factory = layout.lifelines.find((l) => l.participant.id === "Factory")!;
    // Worker head sits lower than Factory head (created inline)
    expect(worker.headY).toBeGreaterThan(factory.headY);
    expect(layout.destroys).toHaveLength(1);
    expect(worker.destroyed).toBe(true);
    // axis stops at the destroy mark
    expect(worker.axisBottom).toBeCloseTo(layout.destroys[0]!.y, 0);
  });
});

describe("sequence layout — constants", () => {
  it("exposes layout constants for downstream tuning", () => {
    expect(SEQ_CONST.EVENT_GAP).toBeGreaterThan(0);
    expect(SEQ_CONST.LIFELINE_GAP).toBeGreaterThan(0);
  });
});
