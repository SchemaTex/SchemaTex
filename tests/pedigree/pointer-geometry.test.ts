import { expect, test } from 'vitest';
import { parsePedigree } from '../../src/diagrams/pedigree/parser';
import { layoutPedigree } from '../../src/diagrams/pedigree/layout';
import { renderPedigree } from '../../src/diagrams/pedigree/renderer';

function drawing(sex: string, size: number, markers = 'proband', label = '') {
  const ast = parsePedigree(`pedigree\n  subject [${sex}, ${markers}${label ? `, label: "${label}"` : ''}]`);
  const layout = layoutPedigree(ast, {nodeWidth:size,nodeHeight:size,nodeSpacingX:80,nodeSpacingY:100});
  return renderPedigree(layout, {fontFamily:'Inter',fontSize:12,theme:'default',padding:20}, ast);
}
const attrs = (svg: string, tag: string, cls: string) => {
  const element = (svg.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? []).find(s => s.includes(`class="${cls}"`));
  expect(element).toBeDefined();
  return Object.fromEntries([...element!.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
};

test.each(['male','female','unknown'].flatMap(sex=>[24,40,64].map(size=>({sex,size}))))(
  'points toward the actual $sex outline at size $size without entering it', ({sex,size}) => {
    const svg=drawing(sex,size);
    const head=attrs(svg,'polygon','schematex-pedigree-proband-arrow-head');
    const points=head.points.split(' ').map(p=>p.split(',').map(Number));
    const [tip,baseA,baseB]=points;
    const base=[(baseA[0]+baseB[0])/2,(baseA[1]+baseB[1])/2];
    expect(tip[0]).toBeGreaterThan(base[0]);
    expect(tip[1]).toBeLessThan(base[1]);
    expect(tip[0]).toBeCloseTo(-tip[1]);
    const outline=sex==='male'?size/2:sex==='female'?size/2/Math.SQRT2:size/4;
    expect(Math.hypot(tip[0]+outline,tip[1]-outline)).toBeCloseTo(3);
    expect(Math.hypot(tip[0]-base[0],tip[1]-base[1])).toBeCloseTo(6);
    const shaft=attrs(svg,'line','schematex-pedigree-proband-arrow-line');
    expect(+shaft.x2).toBeCloseTo(base[0]); expect(+shaft.y2).toBeCloseTo(base[1]);
    expect(svg).not.toContain('marker-end');
  }
);
test('draws one pointer for a person with both roles',()=>{
 const svg=drawing('female',40,'proband, consultand');
 expect(svg.match(/class="schematex-pedigree-proband-arrow-line"/g)).toHaveLength(1);
 expect(svg).toContain('>P/C<');
});
test('keeps a long caption below the pointer instead of crossing its shaft',()=>{
 const svg=drawing('unknown',40,'proband','Long descriptive individual label');
 const shaft=attrs(svg,'line','schematex-pedigree-proband-arrow-line');
 const caption=attrs(svg,'text','schematex-pedigree-label');
 const node=(svg.match(/<g[^>]*data-individual-id="subject"[^>]*>/g)??[])[0];
 const cy=Number(/translate\([^,]+, ([^)]+)\)/.exec(node)![1]);
 expect(+caption.y-cy-12).toBeGreaterThan(+shaft.y1+4);
});
