import { describe, expect, it } from "vitest";
import { parseResult, renderResult } from "../../src";
import { parseIdef0 } from "../../src/diagrams/idef0/parser";
import { parseSociogram } from "../../src/diagrams/sociogram/parser";

const model = '# Context comment\nidef0 "Dispatch orders"\nfunction A1 "Prepare"\nfunction A2 "Send"';
const map = '# Root\n## A\n- A long descriptive label that should wrap with a narrow width\n## B\n- b1';

describe("public parser regressions", () => {
  it.each([['input', 'I'], ['control', 'C'], ['mechanism', 'M'], ['output', 'O']])("consumes %s suffix %s", (role, suffix) => {
    const ast = parseIdef0(`${model}\n${role} A1.${suffix} "A label" (tunnel)`);
    expect(ast.arrows[0]).toMatchObject({ role, label: 'A label', tunneled: true });
    const wrong = suffix === 'I' ? 'C' : 'I';
    expect(() => parseIdef0(`${model}\n${role} A1.${wrong} "Wrong"`)).toThrow(/role|match|contradict/i);
    expect(renderResult(`${model}\n${role} A1.${wrong} "Wrong"`, { type: 'idef0' }).ok).toBe(false);
  });
  it("consumes the flow label separator", () => {
    expect(parseIdef0(`${model}\nA1 -> A2 : "Work package" (tunnel)`).arrows[0]).toMatchObject({ label: 'Work package', tunneled: true });
  });
  it("keeps the diagram title in the TITLE cell", () => {
    const result = renderResult(model, { type: 'idef0' });
    expect(result.ok).toBe(true);
    expect(result.svg).toMatch(/class="sx-idef0-tb-text"[^>]*>Dispatch orders<\/text>/);
  });
  it.each(['# Context', '// Context', '%% Context'])("does not turn a comment-prefixed sociogram header into a node: %s", (comment) => {
    const source = `${comment}\nsociogram "Choices"\nava\nben\ngia\nava -> ben`;
    expect(parseSociogram(source).nodes.map(n => n.id)).toEqual(['ava', 'ben', 'gia']);
    const result = parseResult(source, { type: 'sociogram' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.ast).toMatchObject({ title: 'Choices', nodes: [{id:'ava'}, {id:'ben'}, {id:'gia'}] });
    expect(renderResult(source).type).toBe('sociogram');
  });
  it.each([
    ['state', 'state "Lifecycle"\na\nb\na --> b'],
    ['flowchart', 'flowchart TD\na\nb\na --> b'],
    ['orgchart', 'orgchart "Team"\nLead -> Member'],
    ['rbd', 'rbd "System"\nseries { a b }'],
  ] as const)("keeps bare-node sibling %s headers out of the body", (type, source) => {
    const prefix = type === 'flowchart' ? '%% Context' : '# Context';
    const clean = parseResult(source, {type});
    const commented = parseResult(`${prefix}\n${source}`, {type});
    expect(clean.ok).toBe(true);
    expect(commented.ok).toBe(true);
    if (clean.ok && commented.ok) {
      // Source ranges legitimately move when the comment is prepended.
      const semantics = (ast: unknown) => JSON.stringify(ast, (key, value: unknown) =>
        /(?:range|line|start|end)/i.test(key) ? undefined : value);
      expect(semantics(commented.ast)).toBe(semantics(clean.ast));
    }
  });
  it("removes genuine comments and directives not owned by the selected parser", () => {
    const source = 'sociogram "Choices"\na\nb';
    expect(renderResult(`%% ordinary comment\n%% style: driver\n${source}`, {type:'sociogram'}).svg)
      .toBe(renderResult(source, {type:'sociogram'}).svg);
  });
  it.each(['logic-right', 'futureswheel', 'driver'])("preserves %% style: %s through rendering", style => {
    const result = renderResult(`%% style: ${style}\n${map}`, { type: 'mindmap' });
    expect(result.ok).toBe(true);
    expect(result.svg).not.toBe(renderResult(map, { type: 'mindmap' }).svg);
    expect(renderResult(`A wrapper\n\`\`\`schematex\n%% ordinary comment\n%% style: ${style}\n${map}\n\`\`\``, { type: 'mindmap' }).svg).toBe(result.svg);
  });
  it.each(['theme: dark', 'maxLabelWidth: 80'])("preserves %% %s", directive => {
    expect(renderResult(`%% ${directive}\n${map}`, {type:'mindmap'}).svg).not.toBe(renderResult(map, {type:'mindmap'}).svg);
  });
  it("preserves gitgraph init directives", () => {
    const source = `%%{init: {'gitGraph': {'mainBranchName': 'release', 'orientation': 'TB'}}}%%\ngitGraph\ncommit id: "start"`;
    const result = parseResult(source, {type:'gitgraph'});
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.ast).toMatchObject({mainBranchName:'release', orientation:'TB'});
    expect(renderResult(source).type).toBe('gitgraph');
    expect(renderResult(source, {type:'gitgraph'}).svg).toContain('release');
  });
});
