// Dev-only: reproduce the user's complex reference diagrams with the CURRENT DSL
// to assess coverage. Output: /tmp/schematex-seq-preview/complex.html
import { render } from "../dist/index.js";
import { writeFileSync } from "node:fs";

const examples = [
  {
    title: "Reproduction of #1 — Hotel reservation (annotated tutorial)",
    note: "plain participant boxes, nested loop>alt, self-message w/ return value, create messages, destroy",
    dsl: `sequence "Hotel reservation"
  participant window as "window : UI"
  participant aChain as "aChain : HotelChain"
  participant aHotel as "aHotel : Hotel"
  window ->+ aChain : 1: makeReservation
  aChain ->+ aHotel : 1.1: makeReservation
  loop [each day]
    aHotel -> aHotel : 1.1.1: available(roomId, date): isRoom
    alt [isRoom = true]
      aHotel ->+ *aReservation : 1.1.2: «create»
      aReservation ->+ *aNotice : 2: «create»
    end
  end
  deactivate aHotel
  deactivate aChain
  deactivate window
  destroy window`,
  },
  {
    title: "Reproduction of #3 — Student transcript (UML analysis classes)",
    note: "boundary / control / entity kinds + an «system» actor; create (new), loop, nested activation, self-message",
    dsl: `sequence "Student transcript"
  actor Student
  boundary studentPage as "studentPage : StudentInfoPage"
  control TranscriptBuilder as ": TranscriptBuilder"
  entity student as "student : Student"
  entity Seminar as ": Seminar"
  actor Printer «system»
  Student -> *studentPage : new
  studentPage ->+ TranscriptBuilder : new(student)
  TranscriptBuilder ->+ student : getSeminars()
  deactivate student
  loop [for each seminar]
    TranscriptBuilder ->+ Seminar : getMark()
    Seminar -> Seminar : calculateMark()
    deactivate Seminar
  end
  deactivate TranscriptBuilder
  Student -> studentPage : Print
  studentPage ->+ Printer : print(studentPage)
  deactivate Printer`,
  },
];

const cards = examples
  .map((ex) => {
    let svg;
    try {
      svg = render(ex.dsl);
    } catch (e) {
      svg = `<pre class="err">${String(e && e.message ? e.message : e)}</pre>`;
    }
    const escDsl = ex.dsl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<section class="card">
  <header><h2>${ex.title}</h2><p>${ex.note}</p></header>
  <div class="body">
    <pre class="dsl">${escDsl}</pre>
    <div class="svg">${svg}</div>
  </div>
</section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Schematex — Complex sequence coverage</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font:14px/1.5 system-ui,-apple-system,sans-serif;color:#1f2937;background:#f5f7fa}
  .top{padding:28px 32px 8px}.top h1{margin:0 0 4px;font-size:22px}.top p{margin:0;color:#6b7280}
  .grid{padding:16px 24px 64px;display:grid;gap:20px;max-width:1280px;margin:0 auto}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
  .card header{padding:14px 18px;border-bottom:1px solid #f0f1f3}
  .card header h2{margin:0;font-size:16px}.card header p{margin:4px 0 0;color:#6b7280;font-size:12.5px}
  .body{display:grid;grid-template-columns:330px 1fr}
  @media (max-width:880px){.body{grid-template-columns:1fr}}
  .dsl{margin:0;padding:16px 18px;background:#0f172a;color:#e2e8f0;font:12px/1.5 ui-monospace,Menlo,monospace;overflow:auto;white-space:pre}
  .svg{padding:18px;display:flex;align-items:center;justify-content:center;overflow:auto}
  .svg svg{max-width:100%;height:auto}
  .err{color:#b91c1c}
</style></head>
<body>
  <div class="top"><h1>Complex coverage check</h1><p>Your reference diagrams reproduced with the current v0.1 DSL.</p></div>
  <div class="grid">
${cards}
  </div>
</body></html>`;

writeFileSync("/tmp/schematex-seq-preview/complex.html", html);
console.log("wrote /tmp/schematex-seq-preview/complex.html");
