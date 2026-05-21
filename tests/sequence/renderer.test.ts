import { describe, expect, it } from "vitest";
import { renderSequence } from "../../src/diagrams/sequence/renderer";

describe("sequence renderer — output contract", () => {
  it("produces a semantic svg root", () => {
    const svg = renderSequence(`sequence "Login"
  actor User
  participant API
  User -> API : GET /resource
  API --> User : 200`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('data-diagram-type="sequence"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain("</svg>");
  });

  it("emits a lifeline group per participant with data-id", () => {
    const svg = renderSequence(`sequence
  A -> B : x`);
    expect(svg).toContain('class="sx-seq-lifeline"');
    expect(svg).toContain('data-id="A"');
    expect(svg).toContain('data-id="B"');
  });

  it("tags messages with kind for interactivity", () => {
    const svg = renderSequence(`sequence
  A -> B : sync
  A --> B : reply`);
    expect(svg).toContain('data-kind="sync"');
    expect(svg).toContain('data-kind="reply"');
  });

  it("renders fragment frames with the operator tag", () => {
    const svg = renderSequence(`sequence
  A -> B : req
  alt [ok]
    B --> A : yes
  else [no]
    B --> A : no
  end`);
    expect(svg).toContain('data-op="alt"');
    expect(svg).toContain(">alt<");
  });

  it("renders all twelve fragment operators including the analytical four", () => {
    const svg = renderSequence(`sequence
  participant A
  participant B
  neg
    A -> B : invalid
  end
  ignore {ping, log}
    A -> B : work
  end
  assert
    A -> B : required
  end`);
    expect(svg).toContain('data-op="neg"');
    expect(svg).toContain('data-op="ignore"');
    expect(svg).toContain('data-op="assert"');
    expect(svg).toContain("{ping, log}");
    // neg frame gets the tinted class
    expect(svg).toContain("sx-seq-frame-neg");
  });

  it("renders boundary/control/entity as robustness icons and shows custom stereotypes", () => {
    const svg = renderSequence(`sequence
  boundary UI
  control Ctrl
  entity Data
  actor Printer «system»
  UI -> Ctrl : x
  Ctrl -> Data : y`);
    expect(svg).toContain('data-icon="boundary"');
    expect(svg).toContain('data-icon="control"');
    expect(svg).toContain('data-icon="entity"');
    expect(svg).toContain("«system»");
  });

  it("uses no inline style attributes (semantic-SVG rule)", () => {
    const svg = renderSequence(`sequence
  A -> B : x
  note over A : hello`);
    expect(svg).not.toMatch(/\sstyle="/);
  });

  it("escapes XML in labels", () => {
    const svg = renderSequence(`sequence
  A -> B : a < b & c`);
    expect(svg).toContain("a &lt; b &amp; c");
  });
});
