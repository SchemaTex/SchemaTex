import { describe, expect, test } from "vitest";
import { parse, renderResult, setLabel, setPosition, type SceneItem } from "../../src";

function rendered(source: string) {
  const result = renderResult(source, { scene: true });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.diagnostics[0]?.message);
  return result;
}

function sceneItem(scene: SceneItem[] | undefined, key: string): SceneItem {
  const found = scene?.find((entry) => entry.key === key);
  expect(found, `missing scene item ${key}`).toBeDefined();
  return found!;
}

describe("structured interactive adapters", () => {
  test("network edits authored labels and drags stable device ids with live links", () => {
    const source = [
      'network "Branch Office"',
      'layout: tiered',
      'firewall fw "Edge Firewall" tier: edge',
      'switch sw "Access Switch" tier: access',
      'fw -- sw : fiber "10 Gbps"',
    ].join("\n");
    const base = rendered(source);
    const firewall = sceneItem(base.scene, "node:fw");
    expect(firewall.editable).toEqual({ label: true, position: "free" });
    expect(source.slice(firewall.sourceRange!.start, firewall.sourceRange!.end)).toBe('"Edge Firewall"');
    expect(base.svg).toContain('data-sx-live-start="fw"');
    expect(base.svg).toContain('data-sx-live-end="sw"');

    const renamed = setLabel(source, firewall, "Perimeter Firewall");
    expect((parse(renamed.source) as { devices: Array<{ id: string; label?: string }> }).devices
      .find((device) => device.id === "fw")?.label).toBe("Perimeter Firewall");

    const moved = setPosition(source, firewall, {
      x: firewall.bbox!.x + 76,
      y: firewall.bbox!.y + 34,
    });
    const pinned = rendered(moved.source);
    expect(sceneItem(pinned.scene, "node:fw").bbox?.x).toBeCloseTo(firewall.bbox!.x + 76, 3);
    expect(sceneItem(pinned.scene, "node:fw").bbox?.y).toBeCloseTo(firewall.bbox!.y + 34, 3);
    expect(sceneItem(pinned.scene, "edge:0").path).not.toBe(sceneItem(base.scene, "edge:0").path);
  });

  test("decision tree and fishbone expose exact authored text without position pins", () => {
    const decision = [
      'decisiontree "Support Triage"',
      'question "Is the service down?"',
      '  yes: answer "Page on-call"',
      '  no: answer "Collect a trace"',
    ].join("\n");
    const decisionResult = rendered(decision);
    const question = sceneItem(decisionResult.scene, "node:n1");
    expect(question.editable).toEqual({ label: true, position: "none" });
    expect(decision.slice(question.sourceRange!.start, question.sourceRange!.end)).toBe('"Is the service down?"');
    expect((parse(setLabel(decision, question, "Is production unavailable?").source) as { root: { label: string } }).root.label)
      .toBe("Is production unavailable?");

    const fishbone = [
      'fishbone "Defect Review"',
      'effect "High reject rate"',
      'category method "Method"',
      'method : "Stencil aperture undersized"',
    ].join("\n");
    const fishboneResult = rendered(fishbone);
    const effect = sceneItem(fishboneResult.scene, "label:effect");
    const category = sceneItem(fishboneResult.scene, "rib:0:label");
    const cause = sceneItem(fishboneResult.scene, "rib:0:cause:0");
    expect([effect, category, cause].every((entry) => entry.editable.position === "none")).toBe(true);
    expect((parse(setLabel(fishbone, cause, "Paste viscosity drift").source) as { majors: Array<{ children: Array<{ label: string }> }> })
      .majors[0]?.children[0]?.label).toBe("Paste viscosity drift");
  });

  test("ERD exposes table, column, and type fields while tables drag on the cross-axis", () => {
    const source = [
      "erd",
      "direction: LR",
      'table "Customer Accounts" as Customer {',
      "  customer_id int PK",
      "  email varchar UK",
      "}",
      "table Order {",
      "  customer_id int FK -> Customer.customer_id",
      "}",
      "ref Order.customer_id many-mandatory -- one-mandatory Customer.customer_id",
    ].join("\n");
    const base = rendered(source);
    const table = sceneItem(base.scene, "node:Customer");
    const tableName = sceneItem(base.scene, "node:Customer:name");
    const column = sceneItem(base.scene, "node:Customer:attr:1:name");
    const type = sceneItem(base.scene, "node:Customer:attr:1:type");
    expect(table.editable.position).toBe("move-y");
    expect(source.slice(tableName.sourceRange!.start, tableName.sourceRange!.end)).toBe('"Customer Accounts"');
    expect(source.slice(column.sourceRange!.start, column.sourceRange!.end)).toBe("email");
    expect(source.slice(type.sourceRange!.start, type.sourceRange!.end)).toBe("varchar");
    expect((parse(setLabel(source, column, "email_address").source) as { entities: Array<{ attributes: Array<{ name: string }> }> })
      .entities[0]?.attributes[1]?.name).toBe("email_address");

    const moved = setPosition(source, table, { x: table.bbox!.x, y: table.bbox!.y + 82 });
    const pinned = rendered(moved.source);
    expect(sceneItem(pinned.scene, "node:Customer").bbox?.y).toBeCloseTo(table.bbox!.y + 82, 3);
    expect(sceneItem(pinned.scene, "edge:0").path).not.toBe(sceneItem(base.scene, "edge:0").path);
  });

  test("UML class exposes class, member name, and type fields with cross-axis drag", () => {
    const source = [
      "umlclass",
      'class Order as "Purchase Order" {',
      "  - id : String",
      "  + total : Money",
      "  + place() : void",
      "}",
      "class LineItem {",
      "  + qty : int",
      "}",
      'Order *-- "1..*" LineItem : contains',
    ].join("\n");
    const base = rendered(source);
    const box = sceneItem(base.scene, "node:Order");
    const className = sceneItem(base.scene, "node:Order:name");
    const memberName = sceneItem(base.scene, "node:Order:attr:1:name");
    const memberType = sceneItem(base.scene, "node:Order:attr:1:type");
    expect(box.editable.position).toBe("move-x");
    expect(source.slice(className.sourceRange!.start, className.sourceRange!.end)).toBe('"Purchase Order"');
    expect(source.slice(memberName.sourceRange!.start, memberName.sourceRange!.end)).toBe("total");
    expect(source.slice(memberType.sourceRange!.start, memberType.sourceRange!.end)).toBe("Money");
    expect((parse(setLabel(source, memberType, "Decimal").source) as { classifiers: Array<{ members: Array<{ type?: string }> }> })
      .classifiers[0]?.members[1]?.type).toBe("Decimal");

    const moved = setPosition(source, box, { x: box.bbox!.x + 90, y: box.bbox!.y });
    const pinned = rendered(moved.source);
    expect(sceneItem(pinned.scene, "node:Order").bbox?.x).toBeCloseTo(box.bbox!.x + 90, 3);
  });

  test("P&ID equipment and instruments drag freely while process lines reroute", () => {
    const source = [
      'pid "Pump Loop"',
      'equip T-101 : tank_atm [tag: "Feed Tank"]',
      'equip P-101 : pump_centrifugal [tag: "Feed Pump"]',
      'line L1 from T-101.bottom to P-101.in [type: "process"]',
      'inst FT-101 : field_discrete',
      '  measures L1',
    ].join("\n");
    const base = rendered(source);
    const tank = sceneItem(base.scene, "node:T-101");
    expect(tank.editable.position).toBe("free");
    expect(base.svg).toContain('data-sx-live-start="T-101"');
    expect(base.svg).toContain('data-sx-live-end="P-101"');

    const moved = setPosition(source, tank, { x: tank.bbox!.x + 55, y: tank.bbox!.y + 42 });
    const pinned = rendered(moved.source);
    expect(sceneItem(pinned.scene, "node:T-101").bbox?.x).toBeCloseTo(tank.bbox!.x + 55, 3);
    expect(sceneItem(pinned.scene, "node:T-101").bbox?.y).toBeCloseTo(tank.bbox!.y + 42, 3);
    expect(sceneItem(pinned.scene, "edge:0").path).not.toBe(sceneItem(base.scene, "edge:0").path);
  });

  test("FBD named instances drag on the cross-axis and reroute their wires", () => {
    const source = [
      'fbd "Motor Control"',
      'network 0 "Latch":',
      '  AndHold = AND(Start, Stop)',
      '  MotorOut = OR(Start, AndHold.OUT)',
    ].join("\n");
    const base = rendered(source);
    const block = sceneItem(base.scene, "node:AndHold");
    expect(block.editable.position).toBe("move-y");
    expect(base.svg).toContain('data-sx-live-start="AndHold"');

    const moved = setPosition(source, block, { x: block.bbox!.x, y: block.bbox!.y + 64 });
    const pinned = rendered(moved.source);
    expect(sceneItem(pinned.scene, "node:AndHold").bbox?.y).toBeCloseTo(block.bbox!.y + 64, 3);
  });

  test("Petri places and transitions drag on the cross-axis with attached arcs", () => {
    const source = [
      'petri "Workflow"',
      'direction: lr',
      'place Ready *1',
      'transition Start',
      'place Running',
      'Ready -> Start',
      'Start -> Running',
    ].join("\n");
    const base = rendered(source);
    const place = sceneItem(base.scene, "node:Ready");
    expect(place.editable.position).toBe("move-y");
    expect(base.svg).toContain('data-sx-live-start="Ready"');
    expect(base.svg).toContain('data-sx-live-end="Start"');

    const moved = setPosition(source, place, { x: place.bbox!.x, y: place.bbox!.y + 58 });
    const pinned = rendered(moved.source);
    expect(sceneItem(pinned.scene, "node:Ready").bbox?.y).toBeCloseTo(place.bbox!.y + 58, 3);
    expect(sceneItem(pinned.scene, "edge:0").path).not.toBe(sceneItem(base.scene, "edge:0").path);
  });
});
