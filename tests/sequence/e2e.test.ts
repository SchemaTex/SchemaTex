import { describe, expect, it } from "vitest";
import { render } from "../../src/core/api";

describe("sequence e2e — via public api", () => {
  it("auto-detects the sequence diagram type", () => {
    const svg = render(`sequence
  Alice -> Bob : Authentication Request
  Bob --> Alice : Authentication Response`);
    expect(svg).toContain('data-diagram-type="sequence"');
    expect(svg).toContain("Authentication Request");
  });

  it("renders the full login fixture (TC from the standard doc)", () => {
    const svg = render(`sequence "Login flow"
  actor User
  participant Web as "Web App"
  control Auth
  database DB
  User -> Web : submit(credentials)
  activate Web
  Web ->+ Auth : verify(credentials)
  Auth ->+ DB : SELECT user
  DB --> Auth : row
  deactivate DB
  alt [credentials valid]
    Auth --> Web : token
    Web --> User : 200 OK
  else [invalid]
    Auth --> Web : 401
    Web --> User : error
  end
  deactivate Auth
  deactivate Web
  note over User, Web : session cookie set`);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('data-op="alt"');
    expect(svg).toContain("session cookie set");
    // deterministic: same input → same output
    const again = render(`sequence "Login flow"
  actor User
  participant Web as "Web App"
  control Auth
  database DB
  User -> Web : submit(credentials)
  activate Web
  Web ->+ Auth : verify(credentials)
  Auth ->+ DB : SELECT user
  DB --> Auth : row
  deactivate DB
  alt [credentials valid]
    Auth --> Web : token
    Web --> User : 200 OK
  else [invalid]
    Auth --> Web : 401
    Web --> User : error
  end
  deactivate Auth
  deactivate Web
  note over User, Web : session cookie set`);
    expect(again).toBe(svg);
  });

  it("renders nested fragments + ref without throwing", () => {
    const svg = render(`sequence
  participant A
  participant B
  participant C
  ref over A, B : Establish session
  loop [while queue not empty]
    A -> B : poll()
    opt [item present]
      B -> C : process(item)
    end
  end`);
    expect(svg).toContain('data-op="loop"');
    expect(svg).toContain('data-op="opt"');
    expect(svg).toContain("Establish session");
  });
});
