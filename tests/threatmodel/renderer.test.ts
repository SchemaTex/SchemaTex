import { describe, expect, it } from "vitest";
import {
  renderThreatModel,
  threatmodel,
} from "../../src/diagrams/threatmodel";

const WEBAPP = `threatmodel "Web App — STRIDE"
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

describe("threatmodel plugin", () => {
  it("detect() matches both header keywords", () => {
    expect(threatmodel.detect("threatmodel\nexternal: U")).toBe(true);
    expect(threatmodel.detect("stride\nexternal: U")).toBe(true);
    expect(threatmodel.detect("  STRIDE foo")).toBe(true);
    expect(threatmodel.detect("dfd\n")).toBe(false);
  });

  it("plugin type id is threatmodel", () => {
    expect(threatmodel.type).toBe("threatmodel");
  });
});

describe("threatmodel renderer", () => {
  const svg = renderThreatModel(WEBAPP);

  it("emits a well-formed svg root with accessibility metadata", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain('role="img"');
  });

  it("uses no inline style attributes", () => {
    expect(svg).not.toMatch(/\sstyle="/);
  });

  it("renders DFD shapes: external rect, process circle, store lines", () => {
    expect(svg).toContain("sx-tm-external");
    expect(svg).toContain("sx-tm-process");
    expect(svg).toContain("sx-tm-store-line");
    expect(svg).toContain("<circle");
  });

  it("renders dashed trust boundaries with labels", () => {
    expect(svg).toContain("sx-tm-boundary");
    expect(svg).toContain('data-boundary="DMZ"');
    expect(svg).toContain("stroke-dasharray");
  });

  it("emits per-element STRIDE badges via data-stride", () => {
    // Process gets all six; external gets SR; plain store gets TID.
    expect(svg).toContain('data-stride="STRIDE"');
    expect(svg).toContain('data-stride="SR"');
    expect(svg).toContain('data-stride="TID"');
    // Audit Log store gets conditional R → TRID.
    expect(svg).toContain('data-stride="TRID"');
  });

  it("accents boundary-crossing flows with data-crossing", () => {
    expect(svg).toContain('data-crossing="true"');
    // The User->Web Server flow crosses Internet→DMZ.
    expect(svg).toMatch(/data-from="User"[^>]*data-to="1\.1"[^>]*data-crossing="true"/);
  });

  it("does NOT mark an intra-DMZ flow as crossing", () => {
    // 1.1 -> 1.2 stays within DMZ.
    const m = svg.match(/data-from="1\.1"\s+data-to="1\.2"[^>]*/);
    expect(m).not.toBeNull();
    expect(m![0]).not.toContain('data-crossing="true"');
  });

  it("escapes labels and includes flow data attributes", () => {
    expect(svg).toContain('data-from="User"');
    expect(svg).toContain('data-to="1.1"');
  });

  it("is deterministic", () => {
    expect(renderThreatModel(WEBAPP)).toBe(svg);
  });
});
