import { describe, expect, it } from "vitest";
import { renderPetri } from "../../src/diagrams/petri/renderer";

describe("petri renderer — semantic SVG", () => {
  it("emits the diagram-type, places, transitions and arcs", () => {
    const svg = renderPetri(`petri "demo"
  place P1 *2
  transition T1
  place P2
  P1 -> T1
  T1 -> P2`);
    expect(svg).toContain('data-diagram-type="petri"');
    expect(svg).toContain('class="sx-petri-place"');
    expect(svg).toContain('data-id="P1"');
    expect(svg).toContain('class="sx-petri-bar"'); // immediate transition bar
    expect(svg).toContain('data-from="P1"');
    expect(svg).toContain('class="sx-petri-token"'); // token dots
    expect(svg).toContain("Petri net — demo"); // <title>
  });

  it("renders enabled highlight, capacity dashing, timed box and weight labels", () => {
    const svg = renderPetri(`petri
  place Src *3
  transition gen
  place Buffer capacity: 2
  transition take timed rate: 0.5
  place Out
  Src -> gen weight: 2
  gen -> Buffer
  Buffer -> take
  take -> Out`);
    expect(svg).toContain("sx-petri-enabled"); // gen is enabled
    expect(svg).toContain("sx-petri-place-cap"); // dashed capacity border
    expect(svg).toContain("K=2");
    expect(svg).toContain('class="sx-petri-box"'); // timed transition
    expect(svg).toContain("λ=0.5");
    expect(svg).toContain('class="sx-petri-weight"'); // weight > 1 label
  });

  it("renders an inhibitor dot and a count numeral for >4 tokens", () => {
    const svg = renderPetri(`petri
  place Lock
  place Work *7
  transition run
  place Done
  Work -> run
  run -> Done
  Lock -o run`);
    expect(svg).toContain("sx-petri-inhibitor-dot");
    expect(svg).toContain('data-type="inhibitor"');
    expect(svg).toContain("sx-petri-token-num"); // 7 tokens -> numeral
  });

  it("honors the dark theme tokens", () => {
    const svg = renderPetri(`petri\n  place P *1\n  transition T\n  P -> T`, {
      theme: "dark",
      fontFamily: "",
      fontSize: 12,
      padding: 0,
    });
    expect(svg).toContain("#313244"); // dark place fill
  });
});
