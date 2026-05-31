// Build a single static HTML page showing the umlclass engine across a curated
// set of representative diagram shapes. Open in a browser; no dev server needed.
//
//   node scripts/preview-umlclass.mjs
//   open examples/umlclass-preview.html

import { render } from "../dist/index.js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "examples/umlclass-preview.html");

// A curated, non-redundant set: each example showcases a distinct capability —
// anatomy → inheritance → adornments → patterns → namespaces → Mermaid-compat
// → density → cycles → edge cases.
const examples = [
  {
    id: "anatomy",
    title: "1 — Class anatomy (every member kind)",
    note: "The reference for what a class box looks like: visibility glyphs (+ − # ~), typed attributes, default value, derived `/`, static {static} (underlined), abstract operation (italic), property strings, multi-arg operations, inline generics.",
    dsl: `umlclass
class Account {
  + id : String
  - balance : Money = 0
  # owner : Customer
  ~ region : String
  / available : Money
  + tags : List<String>
  + count : int {static}
  + deposit(amount : Money) : void
  + transfer(to : Account, amount : Money) : boolean {query}
  + audit() : void {abstract}
}`,
  },
  {
    id: "shapes",
    title: "2 — Interface + abstract + concrete (tree-merged heads)",
    note: "Two children of AbstractShape share ONE merged trunk + ONE hollow triangle at the parent — the visible upgrade over Mermaid. Realization (dashed) from the interface, generalization (solid) below.",
    dsl: `umlclass
title: "Shapes"
«interface» Shape {
  + area() : double
  + perimeter() : double
}
abstract class AbstractShape {
  # name : String
  + area() : double {abstract}
  + describe() : String
}
class Circle {
  + radius : double
  + area() : double
}
class Square {
  + side : double
  + area() : double
}
Shape         <|.. AbstractShape
AbstractShape <|-- Circle
AbstractShape <|-- Square`,
  },
  {
    id: "adornments",
    title: "3 — Composition vs aggregation vs dependency",
    note: "The adornment showcase: filled diamond (Order composes LineItems — they die together), hollow diamond (Customer aggregates Addresses — independent), dashed open-arrow dependency (Order uses TaxPolicy), plain association with multiplicities.",
    dsl: `umlclass
title: "Order model"
class Order {
  - id : String
  + total : Money {readOnly}
  + place() : void
}
class LineItem {
  + qty : int
  + subtotal() : Money
}
class Customer { + name : String }
class Address  { + city : String }
class TaxPolicy { + rate(c : Country) : Percent }
Customer "1" -- "*" Order    : places
Order    *-- "1..*" LineItem : contains
Customer o-- "0..*" Address  : has
Order    ..> TaxPolicy       : uses`,
  },
  {
    id: "kingdom",
    title: "4 — Deep inheritance (3 layers, parallel tree-merges)",
    note: "Animal → {Mammal, Bird} → two children each. Stress-tests the layered layout with two simultaneous tree-merges plus a cross-cutting realization to Comparable.",
    dsl: `umlclass
title: "Animal kingdom"
«interface» Comparable {
  + compareTo(o : Object) : int
}
abstract class Animal {
  # name : String
  + makeSound() : void {abstract}
}
abstract class Mammal { + gestation : int }
abstract class Bird   { + wingspan : double }
class Dog     { + makeSound() : void }
class Cat     { + makeSound() : void }
class Eagle   { + makeSound() : void }
class Penguin { + makeSound() : void }
Animal     <|-- Mammal
Animal     <|-- Bird
Mammal     <|-- Dog
Mammal     <|-- Cat
Bird       <|-- Eagle
Bird       <|-- Penguin
Comparable <|.. Dog`,
  },
  {
    id: "strategy",
    title: "5 — Strategy pattern (enum + stereotypes + realization fan)",
    note: "Three concrete strategies realize one interface (tree-merged). «service» / «enumeration» / «interface» stereotypes render above the name; dashed dependency for the using relationship.",
    dsl: `umlclass
title: "Payment strategy"
«enumeration» PaymentMethod {
  CARD
  BANK_TRANSFER
  WALLET
}
«interface» PaymentStrategy {
  + authorize(amount : Money) : AuthResult
  + capture(auth : AuthResult) : Receipt
}
«service» class CheckoutService {
  - strategies : Map<PaymentMethod, PaymentStrategy>
  + pay(method : PaymentMethod, amount : Money) : Receipt
}
class CardStrategy   { + authorize(amount : Money) : AuthResult }
class BankStrategy   { + authorize(amount : Money) : AuthResult }
class WalletStrategy { + authorize(amount : Money) : AuthResult }
PaymentStrategy <|.. CardStrategy
PaymentStrategy <|.. BankStrategy
PaymentStrategy <|.. WalletStrategy
CheckoutService ..> PaymentStrategy : delegates to
CheckoutService ..> PaymentMethod   : selects by`,
  },
  {
    id: "layered",
    title: "6 — Layered architecture (dependency chain + stereotypes)",
    note: "Controller → Service → Repository → Entity. Four custom stereotypes. A pure dependency chain (no inheritance) — tests that the 'source above target' rank rule keeps the call direction reading top-down.",
    dsl: `umlclass
title: "Layered architecture"
«controller» class OrderController {
  + place(req : Request) : Response
  + cancel(id : String) : Response
}
«service» class OrderService {
  + createOrder(input : OrderInput) : Order
  + cancel(id : String) : void
}
«repository» class OrderRepository {
  + save(o : Order) : Order
  + findById(id : String) : Order
}
«entity» class Order {
  + id : String
  + total : Money
}
OrderController ..> OrderService    : delegates
OrderService    ..> OrderRepository : queries
OrderRepository ..> Order           : persists`,
  },
  {
    id: "ns-platform",
    title: "7 — Namespaces: Platform { Auth, Data } + outside Gateway",
    note: "NEW: `namespace` blocks → labelled containment frames. Gateway sits outside the Platform package and delegates into UserService (Auth) and Repository (Data). Frames are the union of their members + nested sub-frames, padded.",
    dsl: `umlclass
title: "Layered packages"
namespace Platform {
namespace Auth {
class UserService {
  + login()
  + logout()
}
}
namespace Data {
class Repository {
  + find()
  + save()
}
}
}
class Gateway {
  + route()
}
Gateway --> UserService : delegates
Gateway --> Repository  : delegates`,
  },
  {
    id: "ns-dotted",
    title: "8 — Dot-notation namespaces (auto-created parents)",
    note: "NEW: `namespace Company.Engineering.Backend` auto-creates Company and Company.Engineering. TechLead lives directly in Engineering and leads a Developer (Backend) + Designer (Frontend). Nested frames stack with a translucent tint.",
    dsl: `umlclass
title: "Org packages"
namespace Company.Engineering.Backend {
class Developer {
  +writeCode()
}
}
namespace Company.Engineering.Frontend {
class Designer {
  +createMockup()
}
}
namespace Company.Engineering {
class TechLead {
  +planSprint()
}
}
TechLead --> Developer : leads
TechLead --> Designer  : leads`,
  },
  {
    id: "mermaid-compat",
    title: "9 — Mermaid-compat (generics, single-line, * / $)",
    note: "NEW: tilde-generics `List~T~`→List<T> (nested `Map~String,List~int~~` too), single-line `Class : +member` / `Class : <<service>>`, member classifiers `flush()*` (abstract) and `count$` (static), and space-return-type `findAll() List~T~`.",
    dsl: `classDiagram
class Repository~T~ {
  +findAll() List~T~
  +findById(id : ID) Optional~T~
  +cache : Map~String,List~int~~
  +count$
  +flush()*
}
class CrudService
CrudService : <<service>>
CrudService : +repo : Repository~User~
CrudService : +save(e : User) User
Repository~T~ <|.. CrudService`,
  },
  {
    id: "ecommerce",
    title: "10 — Dense interconnected domain (e-commerce)",
    note: "Customer and Order are hubs with many spokes; Product is a second hub. The 'web, not tree' stress test — many cross-cutting links and multiplicities, now with populated member compartments.",
    dsl: `umlclass
title: "E-commerce domain"
class Customer { + id : String + name : String }
class Cart { + createdAt : Date + addItem(p : Product) : void }
class Order { + id : String + total() : Money }
class OrderLine { + qty : int + price : Money }
class Product { + sku : String + price : Money }
class Category { + name : String }
class Payment { + amount : Money + authorize() : boolean }
class Shipment { + tracking : String + ship() : void }
class Address { + street : String + city : String }
class Warehouse { + location : String + stock : int }
Customer "1" *-- "1" Cart     : owns
Customer "1" -- "*" Order      : places
Customer "1" o-- "*" Address   : addresses
Cart "1" o-- "*" Product       : contains
Order "1" *-- "*" OrderLine    : lines
OrderLine "*" --> "1" Product  : refers
Order "1" --> "1" Payment      : paidBy
Order "1" --> "1" Shipment     : shippedVia
Shipment "*" --> "1" Address   : to
Product "*" --> "1" Category   : in
Product "*" --> "1" Warehouse  : storedIn`,
  },
  {
    id: "mvc-cycle",
    title: "11 — Bidirectional / cyclic associations (MVC)",
    note: "Controller ↔ Model ↔ View with mutual references — a common gotcha for graph layouts. We keep source-above-target where possible instead of flipping into nonsense.",
    dsl: `umlclass
title: "Model-View-Controller"
class Model {
  - data : State
  + getState() : State
  + setState(s : State) : void
}
class View {
  - controller : Controller
  + render(s : State) : void
}
class Controller {
  - model : Model
  - view : View
  + handle(a : Action) : void
}
Controller --> Model      : updates
Controller --> View       : refreshes
View       --> Controller : delegates
Model      ..> View       : notifies`,
  },
  {
    id: "width-stress",
    title: "12 — Width clamp + truncation",
    note: "Extremely long member signatures prove the BOX_MAX_W cap and per-row '…' truncation (no box stretches absurdly wide). Generic interface realized + extended.",
    dsl: `umlclass
title: "Generic repository (width stress)"
«interface» Repository {
  + findAll() : List<T>
  + findById(id : ID) : Optional<T>
  + save(entity : T) : T
}
class JpaRepository {
  - entityManager : EntityManager
  + saveAndFlush(entity : T) : T
  + findByExampleWithPagination(example : Example<T>, pageable : Pageable) : Page<T>
}
class CustomerRepository {
  + findActiveCustomersByCreatedDateBetween(from : Instant, to : Instant) : List<Customer>
}
Repository    <|.. JpaRepository
JpaRepository <|-- CustomerRepository`,
  },
];

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const renderedCards = examples.map((ex) => {
  let svg = "";
  let error = "";
  try {
    svg = render(ex.dsl);
  } catch (e) {
    error = String(e?.message ?? e);
  }
  return { ex, svg, error };
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>umlclass — visual review</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f5f5f7; color: #0f172a; font-family: -apple-system, system-ui, "Segoe UI", sans-serif; }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 32px 24px 64px; }
  header { margin-bottom: 32px; }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; }
  header p { color: #64748b; margin: 0; font-size: 14px; }
  header a { color: #2563eb; text-decoration: none; }
  header a:hover { text-decoration: underline; }
  .toc { margin: 16px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12px; }
  .toc a { color: #64748b; text-decoration: none; padding: 4px 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
  .toc a:hover { color: #2563eb; border-color: #93c5fd; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
  .card h2 { font-size: 18px; margin: 0 0 6px; letter-spacing: -0.005em; }
  .card .note { color: #64748b; font-size: 13px; line-height: 1.55; margin: 0 0 18px; max-width: 920px; }
  details { margin-top: 14px; }
  details summary { cursor: pointer; color: #64748b; font-size: 12px; font-family: ui-monospace, "SF Mono", Menlo, monospace; user-select: none; padding: 4px 0; }
  details summary:hover { color: #2563eb; }
  details[open] summary { color: #0f172a; }
  pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; font-size: 12px; line-height: 1.5; font-family: ui-monospace, "SF Mono", Menlo, monospace; overflow-x: auto; margin: 8px 0 0; color: #0f172a; }
  .svg-wrap { background: linear-gradient(0deg, #fafafa, #fafafa); border: 1px solid #f1f5f9; border-radius: 8px; padding: 24px; overflow: auto; }
  .svg-wrap svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  .err { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; font-family: ui-monospace, monospace; font-size: 12px; }
  footer { color: #94a3b8; font-size: 12px; text-align: center; padding-top: 24px; }
  footer code { background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>umlclass — visual review</h1>
  <p>Schematex UML class diagram engine. Compare with <a href="https://mermaid.js.org/syntax/classDiagram.html" target="_blank">Mermaid's classDiagram</a> rendering of the same input.</p>
  <ul class="toc">
${examples.map((e) => `    <li><a href="#${e.id}">${escapeHtml(e.title.split("—")[0].trim())}</a></li>`).join("\n")}
  </ul>
</header>

${renderedCards.map(({ ex, svg, error }) => `<section class="card" id="${ex.id}">
  <h2>${escapeHtml(ex.title)}</h2>
  <p class="note">${escapeHtml(ex.note)}</p>
  <div class="svg-wrap">${error ? `<div class="err">parse error: ${escapeHtml(error)}</div>` : svg}</div>
  <details>
    <summary>DSL source</summary>
    <pre>${escapeHtml(ex.dsl)}</pre>
  </details>
</section>`).join("\n\n")}

<footer>
  generated by <code>scripts/preview-umlclass.mjs</code> · ${new Date().toISOString().slice(0, 19).replace("T", " ")} · ${examples.length} examples
</footer>
</div>
</body>
</html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log(`wrote ${OUT} (${examples.length} examples, ${Math.round(html.length / 1024)}KB)`);
