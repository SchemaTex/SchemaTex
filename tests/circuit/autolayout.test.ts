import { describe, test, expect } from "vitest";
import { parseNetlist } from "../../src/diagrams/circuit/netlist";
import { layoutCircuitNetlist } from "../../src/diagrams/circuit/autolayout";
import { render } from "../../src/core/api";
const item = (lo: ReturnType<typeof layoutCircuitNetlist>, id: string) => lo.items.find(i => i.component.id === id)!;
describe("circuit netlist auto-layout — compaction", () => {
  test("shunt cap (pin on GND) drops below the series row, not stranded in it", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in out 1k\nC1 out 0 100n`)
    );
    const r1 = item(lo, "R1");
    const c1 = item(lo, "C1");
    // C1 is a shunt to ground → it sits BELOW the series component, vertical.
    expect(c1.y).toBeGreaterThan(r1.y);
    // and it is oriented vertically (rotated off the horizontal row)
    expect(c1.rotation % 180).not.toBe(0);
  });

  test("series chain stays compact — RC footprint shrinks vs one-row layout", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in out 1k\nC1 out 0 100n`)
    );
    // Old one-row layout was 340 wide; pulling the shunt out keeps it tighter.
    expect(lo.width).toBeLessThan(300);
  });

  test("voltage divider: second resistor (to GND) becomes the shunt leg", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in mid 10k\nR2 mid 0 10k`)
    );
    expect(item(lo, "R2").y).toBeGreaterThan(item(lo, "R1").y);
  });

  test("still renders valid SVG for a multi-pin (transistor) circuit", () => {
    const svg = render(`circuit "CE" netlist
V1 vcc 0 9V
Rc vcc c 2.2k
Rb vcc b 100k
Q1 c b e npn
Re e 0 1k`);
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });

  test("explicit dir= hint still overrides auto orientation", () => {
    const lo = layoutCircuitNetlist(
      parseNetlist(`V1 in 0 5V\nR1 in out 1k dir=up\nC1 out 0 100n`)
    );
    expect(item(lo, "R1").rotation).toBe(270); // up
  });
});


// These fixtures previously asserted one specific arrangement (pilot in the
// middle, straight travellers, passives on a prescribed side of an IC). Keep
// their electrical regression coverage without requiring those templates.
const loadBank = `B1 bat 0 12V type=battery
F1 bat p1 15A
S1 p1 p2 type=switch_spst
K1 p2 fl_out pilot type=automotive_flasher_3pin
S2 fl_out left right type=switch_spdt_center_off
L1 left 0 type=lamp
L2 left 0 type=lamp
D1 left l1 type=led
R1 l1 0 500
D2 left l2 type=led
R2 l2 0 500
D3 pilot p3 type=led
R3 p3 0 1k
L3 right 0 type=lamp
L4 right 0 type=lamp
D4 right r1 type=led
R4 r1 0 500
D5 right r2 type=led
R5 r2 0 500`;
const timer = `V1 VCC GND value="9 V" label="BAT1"
U1 GND TIMING OUT VCC CTRL TIMING DISCH VCC type=555_timer label="U1"
R1 VCC DISCH value="10 kΩ" label="R1"
R2 DISCH TIMING value="100 kΩ" label="R2"
C1 TIMING GND value="10 µF" label="C1"
C2 CTRL GND value="10 nF" label="C2"
R3 OUT LED_A value="470 Ω" label="R3"
D1 LED_A GND type=led label="LED1"`;
const lighting = `V1 live neutral 220Vac type=acsource
F1 live feed 16A
S1 feed t1 t2 type=switch_spdt
S2 switched t1 t2 type=switch_spdt
L1 switched neutral type=lamp`;

test.each([loadBank,timer,lighting])('preserves components and connected terminals under renaming and reordering', source => {
  for (const variant of [source, source.replace(/^(\S+)/gm, '$1_ALT'), source.split('\n').reverse().join('\n')]) {
    const ast=parseNetlist(variant), layout=layoutCircuitNetlist(ast);
    expect(new Set(layout.items.map(i=>i.component.id))).toEqual(new Set(ast.components.map(c=>c.id)));
    expect(Number.isFinite(layout.width)&&Number.isFinite(layout.height)).toBe(true);
    for (const net of ast.nets.filter(n=>n.anchors.length>1)) {
      const routes=layout.routes.filter(r=>r.netId===net.id||r.netId.startsWith(`${net.id}.`));
      for (const [id,pins] of Object.entries(ast.pinMap??{})) for (const [pin,name] of Object.entries(pins)) {
        if(name!==net.id)continue;
        const at=item(layout,id).anchors[pin];expect(at).toBeDefined();
        const touches=routes.some(r=>r.points.slice(1).some((b,i)=>{
          const a=r.points[i];
          return at.x>=Math.min(a.x,b.x)-0.1&&at.x<=Math.max(a.x,b.x)+0.1&&
            at.y>=Math.min(a.y,b.y)-0.1&&at.y<=Math.max(a.y,b.y)+0.1;
        })) || layout.flags?.some(f=>Math.hypot(f.at.x-at.x,f.at.y-at.y)<0.1);
        expect(touches,`${id}.${pin} on ${name}`).toBe(true);
      }
    }
    for(const route of layout.routes)for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i];expect(a.x===b.x||a.y===b.y).toBe(true);
    }
  }
});

test('keeps a replaced multi-pin device and its original net connectivity',()=>{
  const source=loadBank.replace('S2 fl_out left right type=switch_spdt_center_off',
    'X7 fl_out left right pins_left="COMMON" pins_right="RIGHT,LEFT"');
  const ast=parseNetlist(source), layout=layoutCircuitNetlist(ast);
  expect(item(layout,'X7').component.componentType).toBe('generic_ic');
  for(const net of ['fl_out','left','right'])expect(layout.routes.some(r=>r.netId===net||r.netId.startsWith(`${net}.`))).toBe(true);
});

test('preserves an explicit orientation without switching layout strategies',()=>{
  const layout=layoutCircuitNetlist(parseNetlist(timer.replace('R3 OUT LED_A','R3 OUT LED_A dir=right')));
  expect(item(layout,'R3').rotation).toBe(0);
});
