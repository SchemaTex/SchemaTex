// page-home.jsx — Home page sections + shared SiteFooter
// Depends on: shared.jsx (DIAGRAMS, DOMAINS, DSL_SAMPLES, renderTokens, TopNav)
// Exposes: SiteFooter, HomePage

// ================================================================
// SITE FOOTER — shared across all pages, defined here first
// ================================================================

function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="foot-grid">
        <div className="foot-col brand">
          <div className="wm" style={{fontSize: 18}}>schematex<span className="ver">v0.1.0</span></div>
          <p>The open-source rendering engine for diagrams that follow real industry standards. Built by <u>mymap.ai</u>.</p>
        </div>
        <div className="foot-col">
          <h5 className="mono">PRODUCT</h5>
          <ul>
            <li>Playground</li>
            <li>Gallery</li>
            <li>Examples</li>
            <li>Pricing</li>
          </ul>
        </div>
        <div className="foot-col">
          <h5 className="mono">DOCS</h5>
          <ul>
            <li>Getting started</li>
            <li>API reference</li>
            <li>Diagram types</li>
            <li>Contributing</li>
          </ul>
        </div>
        <div className="foot-col">
          <h5 className="mono">COMMUNITY</h5>
          <ul>
            <li>GitHub</li>
            <li>npm</li>
            <li>Issues</li>
            <li>Discussions</li>
          </ul>
        </div>
      </div>
      <div className="foot-rule"/>
      <div className="foot-bot mono">
        <span>© 2026 mymap.ai</span>
        <span>victor@mymap.ai</span>
      </div>
    </footer>
  );
}

// ================================================================
// HERO SHOWCASE — rotating DSL + diagram preview panel
// ================================================================

function HeroShowcase({ pinnedId, setPinnedId }) {
  const [auto, setAuto] = React.useState(true);
  const [idx, setIdx] = React.useState(0);
  const showcaseSet = ['genogram', 'ladder', 'entity', 'pedigree', 'sld'];

  React.useEffect(() => {
    if (!auto || pinnedId) return;
    const t = setInterval(() => setIdx(i => (i + 1) % showcaseSet.length), 4200);
    return () => clearInterval(t);
  }, [auto, pinnedId]);

  const activeId = pinnedId || showcaseSet[idx];
  const diag = DIAGRAMS.find(d => d.id === activeId);
  const Stub = diag.Stub;
  const tokens = DSL_SAMPLES[activeId] || DSL_SAMPLES.genogram;

  return (
    <div className="showcase">
      <div className="showcase-bar">
        <div className="dots"><span/><span/><span/></div>
        <div className="showcase-tabs">
          {showcaseSet.map((id) => (
            <div key={id}
                 className={`stab ${activeId === id ? 'active' : ''}`}
                 onClick={() => { setPinnedId(id); setAuto(false); }}>
              {id}
            </div>
          ))}
        </div>
        <div className="showcase-meta">§ {diag.std}</div>
      </div>
      <div className="showcase-split">
        <div className="showcase-code">
          <pre>{renderTokens(tokens)}</pre>
        </div>
        <div className="showcase-render">
          <Stub/>
        </div>
      </div>
      <div className="showcase-foot">
        <span>render: 3.2 ms · pure SVG · 0 runtime deps</span>
        <span>→ {diag.name.toLowerCase()}</span>
      </div>
    </div>
  );
}

// ================================================================
// HERO — above-the-fold section
// ================================================================

function Hero({ pinnedId, setPinnedId }) {
  return (
    <section className="hero">
      <div className="hero-l">
        <div className="hero-eye"><i/>13 DIAGRAM FAMILIES · 10+ STANDARDS · 0 DEPS</div>
        <h1>
          The diagrams your domain experts<br/>
          <em>actually sign off on.</em>
        </h1>
        <p className="lede">
          Mermaid draws generic flowcharts. Schematex draws a genogram a genetic
          counselor accepts clinically, ladder logic that maps 1:1 to IEC 61131-3,
          and a cap table that survives a Series A review — all from a tiny text DSL.
        </p>
        <div className="hero-badges">
          <span className="badge accent">zero deps</span>
          <span className="badge">TypeScript · strict</span>
          <span className="badge">pure SVG</span>
          <span className="badge">LLM-native</span>
        </div>
        <div className="btn-row">
          <button className="btn primary">Open playground<span className="kbd">↵</span></button>
          <button className="btn">Read the docs</button>
        </div>
        <code className="hero-install mono">
          <span className="muted">$</span> npm install schematex
        </code>
      </div>
      <div className="hero-r">
        <HeroShowcase pinnedId={pinnedId} setPinnedId={setPinnedId}/>
      </div>
    </section>
  );
}

// ================================================================
// STANDARDS RAIL — scrolling ticker of standard names
// ================================================================

function StandardsRail() {
  const standards = [
    'IEC 61131-3', 'IEEE 315', 'IEEE 91', 'McGoldrick 2020',
    'NSGC', 'Hartman 1978', 'Newick + NHX', 'Moreno sociometry',
    'SPICE netlist', 'WaveDrom', 'Ishikawa', 'IEC 60617'
  ];
  const doubled = [...standards, ...standards];
  return (
    <div className="rail">
      <div className="rail-inner">
        {doubled.map((s, i) => (
          <span className="rail-item" key={i}>
            <span className="rail-glyph">§</span>{s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// CLUSTERS — 4 domain cards, each with diagram list + stub preview
// ================================================================

function Clusters() {
  const grouped = {};
  DIAGRAMS.forEach(d => {
    (grouped[d.dom] = grouped[d.dom] || []).push(d);
  });
  const order = ['relations', 'electrical', 'corporate', 'causality'];

  return (
    <section className="section">
      <div className="section-hd">
        <div className="eye">02 / WHERE SCHEMATEX IS THE PROFESSIONAL CHOICE</div>
        <h2>The diagrams other libraries can't draw.</h2>
        <p>Every diagram type implements a published specification — McGoldrick genograms, IEC 61131-3 ladder logic, IEEE 315 single-line diagrams, NSGC pedigrees, Newick phylogenetic trees. No existing open-source library covers this spread.</p>
      </div>
      <div className="clusters">
        {order.map((key, i) => {
          const d = DOMAINS[key];
          const items = grouped[key] || [];
          const hero = items[0];
          const HeroStub = hero.Stub;
          return (
            <div className="cluster-card" key={key}>
              <div className="cluster-hd">
                <div className="cluster-num mono">0{i+1}</div>
                <div className="cluster-dot" style={{background: d.color}}/>
                <span className="cluster-tag mono">{items.length} types</span>
              </div>
              <div className="cluster-stage"><HeroStub/></div>
              <div className="cluster-body">
                <h3>{d.label}</h3>
                <p>{d.blurb}</p>
                <ul className="cluster-list mono">
                  {items.map(it => (
                    <li key={it.id}>
                      <span className="nm">{it.name}</span>
                      <span className="std">§ {it.std}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ================================================================
// WHY — three-pillar value proposition
// ================================================================

function Why() {
  const pillars = [
    { n: '13', unit: 'FAMILIES', t: 'Standards-compliant output',
      b: 'Every diagram type implements a published spec — McGoldrick, IEC 61131-3, IEEE 315, NSGC, Newick. Domain experts accept it.' },
    { n: '0', unit: 'RUNTIME DEPS', t: 'Hand-written everything',
      b: 'No D3, no dagre, no parser generators. Each diagram is an independent plugin with its own parser, layout, renderer.' },
    { n: 'LLM', unit: 'NATIVE DSL', t: 'Shaped by what AIs get wrong',
      b: 'Minimal grammars an LLM can learn from one example. Error messages name the line and suggest a fix.' }
  ];
  return (
    <section className="section">
      <div className="section-hd">
        <div className="eye">03 / WHY</div>
        <h2>Built for diagrams people sign off on.</h2>
        <p>Generic flowchart tools can't draw professional diagrams. Schematex treats each standard as a first-class citizen.</p>
      </div>
      <div className="pillars">
        {pillars.map((p, i) => (
          <div className="pillar" key={i}>
            <div className="pillar-big mono">{p.n}</div>
            <div className="pillar-unit mono">{p.unit}</div>
            <h3>{p.t}</h3>
            <p>{p.b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ================================================================
// COMPARISON — competitive table
// ================================================================

function Comparison() {
  const rows = [
    { tool: 'Mermaid',    std: 'generic flowcharts only',  deps: 'dagre-d3',   pricing: 'free',        llm: '—' },
    { tool: 'GoJS',       std: 'isolated samples',         deps: '—',          pricing: '$7k+ / seat', llm: '—' },
    { tool: 'Schemdraw',  std: 'circuits only',            deps: 'matplotlib', pricing: 'free',        llm: 'Python only' },
    { tool: 'draw.io',    std: 'GUI — no published spec',  deps: '—',          pricing: 'free',        llm: '—' },
    { tool: 'schematex',  std: '13 families · spec-cited', deps: '0',          pricing: 'free',        llm: 'designed for it', us: true }
  ];
  return (
    <section className="section">
      <div className="section-hd">
        <div className="eye">04 / POSITIONING</div>
        <h2>Not another flowchart library.</h2>
        <p>How Schematex compares to the tools people already reach for.</p>
      </div>
      <div className="cmp-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Domain standards</th>
              <th>Deps</th>
              <th>Pricing</th>
              <th>LLM-shaped DSL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.us ? 'us' : ''}>
                <td className="strong">
                  {r.us && <span className="us-mark">▸</span>}
                  {r.tool}
                </td>
                <td className={r.us ? 'y' : 'n'}>{r.std}</td>
                <td className={r.us ? 'strong y' : ''}>{r.deps}</td>
                <td>{r.pricing}</td>
                <td className={r.us ? 'y' : 'n'}>{r.llm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ================================================================
// FINAL CTA — bottom-of-page call to action
// ================================================================

function FinalCTA() {
  return (
    <section className="section cta">
      <div className="cta-inner">
        <div className="eye">— END OF PAGE —</div>
        <h2>Start with a single string.</h2>
        <div className="cta-block mono">
          <span className="muted">import</span> {'{ render }'} <span className="muted">from</span> <span className="str">'schematex'</span>;
        </div>
        <div className="btn-row center">
          <button className="btn primary">npm install schematex</button>
          <button className="btn">Open playground</button>
          <button className="btn ghost">github ↗</button>
        </div>
      </div>
    </section>
  );
}

// ================================================================
// HOME PAGE — composes all sections
// ================================================================

function HomePage({ pinnedId, setPinnedId }) {
  return (
    <>
      <Hero pinnedId={pinnedId} setPinnedId={setPinnedId}/>
      <StandardsRail/>
      <Clusters/>
      <Why/>
      <Comparison/>
      <FinalCTA/>
      <SiteFooter/>
    </>
  );
}

Object.assign(window, { SiteFooter, HomePage });
