// Dev-only: render a gallery of sequence-diagram examples to a static HTML page
// for visual review. Not part of the build. Output: /tmp/schematex-seq-preview.
import { render } from "../dist/index.js";
import { writeFileSync } from "node:fs";

const examples = [
  {
    title: "Login flow",
    note: "actor · control · database heads, activation bars, alt fragment, note",
    dsl: `sequence "Login flow"
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
  note over User, Web : session cookie set`,
  },
  {
    title: "Async + self message",
    note: "synchronous, asynchronous (open head), self-loop, dashed reply",
    dsl: `sequence
  participant Client
  participant Server
  Client ->+ Server : request()
  Server ->> Server : validate()
  Server -->- Client : response`,
  },
  {
    title: "Object lifecycle",
    note: "create (arrow to box edge), found ●→, lost →●, destroy ✕",
    dsl: `sequence
  participant Factory
  Factory -> *Worker : «create»
  o-> Worker : external trigger
  Worker -x : fire-and-forget
  destroy Worker`,
  },
  {
    title: "Nested fragments + ref",
    note: "interaction-use (ref) + loop containing opt — beyond Mermaid",
    dsl: `sequence
  participant A
  participant B
  participant C
  ref over A, B : Establish session
  loop [while queue not empty]
    A -> B : poll()
    opt [item present]
      B -> C : process(item)
    end
  end`,
  },
  {
    title: "Parallel (par / and)",
    note: "concurrent operands",
    dsl: `sequence
  participant Gateway as "API Gateway"
  participant Inventory
  participant Pricing
  par
    Gateway -> Inventory : check stock
    Inventory --> Gateway : 12 units
  and
    Gateway -> Pricing : get price
    Pricing --> Gateway : $42.00
  end`,
  },
  {
    title: "Analytical operators (neg / consider / assert)",
    note: "the full UML combined-fragment set — neg is tinted, consider shows its {message set}",
    dsl: `sequence "Combined fragments"
  participant A
  participant B
  neg
    A -> B : never this
  end
  consider {commit, rollback}
    A ->+ B : begin
    B -->- A : commit
  end
  assert
    A -> B : must occur
  end`,
  },
  {
    title: "Autonumber + dividers",
    note: "auto-numbered messages and section dividers",
    dsl: `sequence "Checkout"
  autonumber 1 1
  actor Shopper
  participant Cart
  participant Payment
  == Phase 1: review ==
  Shopper -> Cart : view items
  Cart --> Shopper : line items
  == Phase 2: pay ==
  Shopper ->+ Payment : charge(card)
  Payment -->- Shopper : receipt`,
  },
  {
    title: "AI-friendly: CJK labels",
    note: "Chinese participant names + 「…」 quotes parse cleanly",
    dsl: `sequence "下单流程"
  actor 用户
  participant 服务 as 「订单服务」
  database 库存
  用户 -> 服务 : 提交订单
  服务 ->+ 库存 : 扣减库存
  库存 -->- 服务 : 确认
  服务 --> 用户 : 下单成功`,
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
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Schematex — Sequence diagram preview</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #1f2937; background: #f5f7fa; }
  .top { padding: 28px 32px 8px; }
  .top h1 { margin: 0 0 4px; font-size: 22px; }
  .top p { margin: 0; color: #6b7280; }
  .grid { padding: 16px 24px 64px; display: grid; gap: 20px; grid-template-columns: 1fr; max-width: 1280px; margin: 0 auto; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .card header { padding: 14px 18px; border-bottom: 1px solid #f0f1f3; }
  .card header h2 { margin: 0; font-size: 16px; }
  .card header p { margin: 4px 0 0; color: #6b7280; font-size: 12.5px; }
  .body { display: grid; grid-template-columns: 360px 1fr; gap: 0; align-items: stretch; }
  @media (max-width: 880px){ .body { grid-template-columns: 1fr; } }
  .dsl { margin: 0; padding: 16px 18px; background: #0f172a; color: #e2e8f0; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow: auto; white-space: pre; border-right: 1px solid #f0f1f3; }
  .svg { padding: 18px; display: flex; align-items: center; justify-content: center; overflow: auto; }
  .svg svg { max-width: 100%; height: auto; }
  .err { color: #b91c1c; }
  footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 0 0 40px; }
</style>
</head>
<body>
  <div class="top">
    <h1>Schematex — Sequence diagram preview</h1>
    <p>UML 2.5.1 §17. ${examples.length} examples · all 12 combined-fragment operators · zero runtime deps.</p>
  </div>
  <div class="grid">
${cards}
  </div>
  <footer>Generated by scripts/preview-sequence.mjs — not committed.</footer>
</body>
</html>`;

const out = "/tmp/schematex-seq-preview/index.html";
writeFileSync(out, html);
console.log("wrote", out);
