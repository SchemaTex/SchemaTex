// Upgraded Playground + Gallery (overrides exports from pages.jsx)
// ------------------------------------------------------------------
// Playground:   DSL editor (syntax-highlit) • preset switcher •
//               export SVG/PNG/PDF • share link • error panel
// Gallery:      cluster filter • use-case filter • search •
//               richer cards (thumb + title + standard + 1-line desc)

const { useState: useS2, useEffect: useE2, useRef: useR2, useMemo: useM2 } = React;

// ================================================================
// DATA — use-case tags and one-line descriptions per diagram type
// ================================================================

// Each diagram type → canonical use-case buckets (clinical / education / production / research / business)
const USE_CASE_MAP = {
  genogram:  ['clinical', 'education'],
  pedigree:  ['clinical', 'research'],
  ecomap:    ['clinical', 'education'],
  sociogram: ['research', 'education'],
  phylo:     ['research', 'education'],
  ladder:    ['production'],
  sld:       ['production', 'business'],
  circuit:   ['production', 'education'],
  logic:     ['production', 'education'],
  timing:    ['production', 'research'],
  entity:    ['business'],
  block:     ['production', 'research'],
  fishbone:  ['production', 'business']
};

const USE_CASES = {
  clinical:   { label: 'Clinical',   blurb: 'Patient-facing / medical' },
  education:  { label: 'Education',  blurb: 'Teaching, exams, textbooks' },
  production: { label: 'Production', blurb: 'Factory, engineering, ops' },
  research:   { label: 'Research',   blurb: 'Academic / scientific' },
  business:   { label: 'Business',   blurb: 'Legal, finance, corporate' }
};

// One-line descriptions per diagram type
const DIAGRAM_DESC = {
  genogram:  'Three-generation family systems with relationship quality',
  ladder:    'IEC 61131-3 rungs — contacts, coils, parallel branches',
  entity:    'Corporate ownership tree with tier-aware rollup',
  pedigree:  'Clinical pedigree — affected, carrier, proband',
  phylo:     'Rooted tree with branch lengths (Newick)',
  sld:       'One-line power diagram — IEEE 315 symbols',
  circuit:   'Schematic from SPICE netlist — resistors, sources',
  logic:     'Combinational logic gates — IEEE 91',
  timing:    'Digital waveforms with edges and annotations',
  ecomap:    'Household & external systems with relationship lines',
  sociogram: 'Group network — ties, cliques, isolates',
  block:     'Signal-flow with summing junctions and feedback',
  fishbone:  'Cause categorization — 6M, 5P, custom'
};

// ================================================================
// DSL source text per diagram (what the editor actually shows)
// ================================================================

const DSL_TEXT = {
  genogram: `genogram "The Potter Family"
  fleamont [male, 1909, deceased]
  euphemia [female, 1920, deceased]
  fleamont -- euphemia
    james [male, 1960, deceased]
  james -- lily "m. 1978"
    harry [male, 1980, index]
  harry -close- lily`,

  ladder: `ladder "Mode Select"
rung 1 "Set Auto":
  XIC(AUTO_HMIPB, "BIT 5.10")
  XIO(MANL_HMIPB, "BIT 5.11")
  XIO(SYS_FAULT, "BIT 3.0")
  parallel:
    OTL(SYS_AUTO, "BIT 3.1")
    OTU(SYS_MANUAL, "BIT 3.2")`,

  entity: `entity "Acme Holdings"
  acme_inc  [type: corp,  jurisdiction: DE]
  acme_uk   [type: ltd,   jurisdiction: UK]
  acme_fund [type: fund,  jurisdiction: KY]
  trust_a   [type: trust, jurisdiction: SD]
  trust_a   --100%--> acme_inc
  acme_inc  --100%--> acme_uk
  acme_inc   --60%--> acme_fund`,

  pedigree: `pedigree "BRCA1 Family"
  I-1 [male, unaffected]
  I-2 [female, affected, deceased]
  I-1 -- I-2
    II-1 [male, carrier]
    II-2 [female, affected]
  II-2 -- II-3
    III-1 [female, proband]`,

  phylo: `phylo "Bacterial diversity"
  ((E_coli:0.12, Salmonella:0.15):0.04,
   (B_subtilis:0.18, L_acidophilus:0.22):0.09,
   Synechocystis:0.31);`,

  sld: `sld "13.8 kV substation"
  grid    [utility, 138kV]
  xfmr_1  [transformer, 138/13.8, 25MVA]
  bus_a   [bus, 13.8kV]
  fdr_1   [feeder, load=8MVA]
  grid -> xfmr_1 -> bus_a -> fdr_1`,

  circuit: `circuit "CE amplifier"
  V1 1 0 DC 12V
  R1 1 2 4.7k
  R2 2 0 1k
  Q1 3 2 0 2N3904
  Rc 1 3 2.2k
  Cin 2 in 10u`,

  logic: `logic "1-bit full adder"
  A, B, Cin -> XOR -> s1
  A, B -> AND -> c1
  s1, Cin -> XOR -> Sum
  s1, Cin -> AND -> c2
  c1, c2 -> OR -> Cout`,

  timing: `timing "SPI transaction"
  clk:   p.p.p.p.p.p.p.p
  mosi:  =.=....=.=.==..
  miso:  ....=.==...=...
  cs_n:  1..............0`,

  ecomap: `ecomap "Nguyen resettlement"
  household: { nguyen_adult, nguyen_child }
  work        -strong-    nguyen_adult
  school      -strong-    nguyen_child
  healthcare  -stressful- nguyen_adult
  community   -tenuous-   household`,

  sociogram: `sociogram "6th grade"
  ava, ben, carlos, dev, ella, finn
  ava    -> ben     (friend)
  ben    -> ava     (friend)
  carlos -> ava     (admires)
  dev    -> ben     (friend)
  ella   :: isolate
  finn   -> carlos  (rivalry)`,

  block: `block "PID loop"
  setpoint -> (+) -> PID -> plant -> output
                ^                       |
                |--  feedback  <--------|`,

  fishbone: `fishbone "Line-03 downtime"
  category man:       { training, shift_change }
  category machine:   { bearing_wear, sensor_drift }
  category method:    { changeover_time }
  category material:  { resin_batch_var }`
};

// ================================================================
// Simple DSL syntax highlighter (good enough for display)
// ================================================================
const KW = new Set([
  'genogram','ladder','entity','pedigree','phylo','sld','circuit','logic',
  'timing','ecomap','sociogram','block','fishbone',
  'rung','parallel','category','household','affected','carrier','unaffected',
  'proband','deceased','index','male','female','type','jurisdiction','isolate',
  'XIC','XIO','OTL','OTU','OTE','AND','OR','XOR','NAND','NOR','NOT'
]);

function highlightLine(line) {
  const parts = [];
  // tokenize by regex — strings, numbers, idents, ops, whitespace
  const re = /("[^"]*"|'[^']*')|(-?\d+(?:\.\d+)?%?|0x[\da-f]+)|([A-Za-z_][A-Za-z0-9_-]*)|(\/\/.*$)|([\[\](){},:;=<>+\-*\/|^&!?]+|-->|->|--)|(\s+)/g;
  let m, idx = 0, key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > idx) parts.push(<span key={key++}>{line.slice(idx, m.index)}</span>);
    if (m[1])      parts.push(<span key={key++} className="tok-str">{m[1]}</span>);
    else if (m[2]) parts.push(<span key={key++} className="tok-num">{m[2]}</span>);
    else if (m[3]) parts.push(KW.has(m[3])
                     ? <span key={key++} className="tok-kw">{m[3]}</span>
                     : <span key={key++}>{m[3]}</span>);
    else if (m[4]) parts.push(<span key={key++} className="tok-com">{m[4]}</span>);
    else if (m[5]) parts.push(<span key={key++} className="tok-op">{m[5]}</span>);
    else           parts.push(<span key={key++}>{m[6]}</span>);
    idx = re.lastIndex;
  }
  if (idx < line.length) parts.push(<span key={key++}>{line.slice(idx)}</span>);
  return parts;
}

// ================================================================
// PLAYGROUND PAGE
// ================================================================
function PlaygroundPage2() {
  const [active, setActive] = useS2(() => {
    try { return localStorage.getItem('schematex.pg.active') || 'genogram'; }
    catch(e) { return 'genogram'; }
  });
  const [source, setSource] = useS2(() => DSL_TEXT[active] || DSL_TEXT.genogram);
  const [exportOpen, setExportOpen] = useS2(false);
  const [shareState, setShareState] = useS2('idle'); // idle | copied
  const editorRef = useR2(null);

  // When user switches preset, replace source (unless they've edited — we don't track dirty; simple replace is fine here)
  useE2(() => {
    setSource(DSL_TEXT[active] || '');
    try { localStorage.setItem('schematex.pg.active', active); } catch(e) {}
  }, [active]);

  const diag = DIAGRAMS.find(d => d.id === active);
  const Stub = diag.Stub;
  const lines = source.split('\n');

  // Fake parse telemetry
  const parseMs = (2 + Math.random() * 3).toFixed(1);
  const svgKb = (3 + (source.length / 200)).toFixed(1);

  const handleShare = () => {
    try {
      const fakeUrl = `schematex.dev/p/${active}/${btoa(source).slice(0, 8)}`;
      navigator.clipboard && navigator.clipboard.writeText('https://' + fakeUrl);
    } catch(e) {}
    setShareState('copied');
    setTimeout(() => setShareState('idle'), 1800);
  };

  const doExport = (fmt) => {
    setExportOpen(false);
    // no-op in mockup
    console.log('export', fmt);
  };

  return (
    <div className="page-wrap pg-wrap">
      <div className="page-hd pg-hd">
        <div className="eye">/ PLAYGROUND</div>
        <h1>Live editor</h1>
        <p>Edit the DSL on the left. Diagram re-renders on the right. Pick a preset below to start from a real example, or share your current source as a permalink.</p>
      </div>

      {/* Preset rail */}
      <div className="pg2-rail-wrap">
        <div className="pg2-rail-lbl mono">PRESETS ·</div>
        <div className="pg2-rail">
          {DIAGRAMS.map(d => {
            const DStub = d.Stub;
            const dom = DOMAINS[d.dom];
            return (
              <button key={d.id}
                      className={`pg2-preset ${active === d.id ? 'active' : ''}`}
                      onClick={() => setActive(d.id)}
                      title={d.name + ' · ' + d.std}>
                <div className="pg2-preset-thumb"><DStub/></div>
                <div className="pg2-preset-name mono">
                  <i className="pg2-dot" style={{background: dom.color}}/>
                  {d.id}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main panel */}
      <div className="pg2-panel">
        <div className="pg2-bar">
          <div className="pg2-bar-l">
            <div className="dots"><span/><span/><span/></div>
            <div className="pg2-file mono">
              <span className="pg2-file-name">{active}.schematex</span>
              <span className="sep">·</span>
              <span className="pg2-file-std">§ {diag.std}</span>
            </div>
          </div>
          <div className="pg2-bar-r mono">
            <button className="btn-mini" onClick={handleShare} title="Copy share link">
              {shareState === 'copied' ? '✓ copied' : '⎘ share'}
            </button>
            <div className="pg2-export-wrap">
              <button className="btn-mini" onClick={() => setExportOpen(o => !o)}>
                ↓ export
              </button>
              {exportOpen && (
                <div className="pg2-menu">
                  <button className="pg2-menu-item" onClick={() => doExport('svg')}>
                    <span className="mono">.svg</span><span className="muted">vector</span>
                  </button>
                  <button className="pg2-menu-item" onClick={() => doExport('png')}>
                    <span className="mono">.png</span><span className="muted">@2× raster</span>
                  </button>
                  <button className="pg2-menu-item" onClick={() => doExport('pdf')}>
                    <span className="mono">.pdf</span><span className="muted">print-ready</span>
                  </button>
                </div>
              )}
            </div>
            <button className="btn-mini primary" title="Re-render">
              ▷ render <span className="kbd">⌘R</span>
            </button>
          </div>
        </div>

        <div className="pg2-split">
          {/* LEFT — editor */}
          <div className="pg2-editor">
            <div className="pg2-gutter mono">
              {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <div className="pg2-code-wrap">
              <pre className="pg2-code mono" aria-hidden="true">
                {lines.map((ln, i) => (
                  <div key={i} className="pg2-code-line">
                    {ln.length ? highlightLine(ln) : <span>&nbsp;</span>}
                  </div>
                ))}
              </pre>
              <textarea
                ref={editorRef}
                className="pg2-textarea mono"
                value={source}
                onChange={e => setSource(e.target.value)}
                spellCheck={false}
                aria-label="DSL source editor"
              />
            </div>
          </div>

          {/* RIGHT — preview */}
          <div className="pg2-preview">
            <div className="pg2-preview-bar mono">
              <span>↘ preview</span>
              <div className="pg2-zoom">
                <button>−</button>
                <span>100%</span>
                <button>+</button>
              </div>
            </div>
            <div className="pg2-stage">
              <div className="pg2-grid">
                <div className="pg2-svg-holder"><Stub/></div>
              </div>
            </div>
          </div>
        </div>

        <div className="pg2-foot mono">
          <span className="pg2-foot-l">
            UTF-8 · LF · {lines.length} lines · {source.length} chars
          </span>
          <span className="pg2-foot-r">
            <span className="pg2-ok">●</span> parsed
            <span className="sep">·</span>
            <span className="ac">{parseMs} ms</span>
            <span className="sep">·</span>
            {svgKb} KB SVG
          </span>
        </div>
      </div>

      <SiteFooter/>
    </div>
  );
}

// ================================================================
// GALLERY PAGE
// ================================================================
function GalleryPage2({ setRoute }) {
  const [cluster, setCluster] = useS2('all');
  const [useCase, setUseCase] = useS2('all');
  const [query, setQuery] = useS2('');

  // Build full example list from data
  const allExamples = useM2(() => {
    const items = [];
    DIAGRAMS.forEach(d => {
      const titles = exampleTitles2(d.id);
      titles.forEach((t, i) => {
        items.push({
          id: d.id + '-' + i,
          title: t,
          diag: d,
          desc: DIAGRAM_DESC[d.id] || '',
          uses: USE_CASE_MAP[d.id] || []
        });
      });
    });
    return items;
  }, []);

  const filtered = allExamples.filter(ex => {
    if (cluster !== 'all' && ex.diag.dom !== cluster) return false;
    if (useCase !== 'all' && !ex.uses.includes(useCase)) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!ex.title.toLowerCase().includes(q)
          && !ex.diag.name.toLowerCase().includes(q)
          && !ex.diag.std.toLowerCase().includes(q)
          && !ex.desc.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const resetAll = () => { setCluster('all'); setUseCase('all'); setQuery(''); };
  const anyFilter = cluster !== 'all' || useCase !== 'all' || query !== '';

  return (
    <div className="page-wrap gal2-wrap">
      <div className="page-hd">
        <div className="eye">/ GALLERY</div>
        <div className="gal-stats mono">
          <span className="badge">{allExamples.length} examples</span>
          <span className="badge">{DIAGRAMS.length} types</span>
          <span className="badge">{Object.keys(DOMAINS).length} clusters</span>
        </div>
        <h1>Every diagram, in the wild.</h1>
        <p>Real-world examples — each reproducible from its DSL, each conforming to its published standard.</p>
      </div>

      {/* Filters — three rows: search, cluster, use-case */}
      <div className="gal2-filters">
        <div className="gal2-search">
          <svg className="gal2-search-i" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input
            type="text"
            placeholder="Search title, standard, diagram type…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="mono"
          />
          {query && (
            <button className="gal2-search-x mono" onClick={() => setQuery('')} aria-label="Clear search">×</button>
          )}
        </div>

        <div className="gal2-row">
          <span className="gal2-row-lbl mono">CLUSTER</span>
          <div className="gal2-chips">
            <button className={`gal2-chip ${cluster === 'all' ? 'active' : ''}`} onClick={() => setCluster('all')}>
              <span className="mono">all</span>
            </button>
            {Object.entries(DOMAINS).map(([k, v]) => (
              <button key={k}
                      className={`gal2-chip ${cluster === k ? 'active' : ''}`}
                      onClick={() => setCluster(k)}>
                <i className="gal2-chip-dot" style={{background: v.color}}/>
                <span className="mono">{v.label.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="gal2-row">
          <span className="gal2-row-lbl mono">USE-CASE</span>
          <div className="gal2-chips">
            <button className={`gal2-chip ${useCase === 'all' ? 'active' : ''}`} onClick={() => setUseCase('all')}>
              <span className="mono">all</span>
            </button>
            {Object.entries(USE_CASES).map(([k, v]) => (
              <button key={k}
                      className={`gal2-chip ${useCase === k ? 'active' : ''}`}
                      onClick={() => setUseCase(k)}>
                <span className="mono">{v.label.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="gal2-status mono">
          <span>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
            {anyFilter && <>  <span className="sep">·</span>  filtered from {allExamples.length}</>}
          </span>
          {anyFilter && (
            <button className="gal2-reset" onClick={resetAll}>reset filters ×</button>
          )}
        </div>
      </div>

      {/* Grid OR empty state */}
      {filtered.length === 0 ? (
        <div className="gal2-empty">
          <div className="gal2-empty-mark mono">/ 0</div>
          <h3>No examples match.</h3>
          <p>Try a different cluster, drop the use-case filter, or clear the search.</p>
          <button className="btn" onClick={resetAll}>Reset filters</button>
        </div>
      ) : (
        <div className="gal2-grid">
          {filtered.map(ex => {
            const DStub = ex.diag.Stub;
            const dom = DOMAINS[ex.diag.dom];
            return (
              <article className="gal2-card" key={ex.id}>
                <div className="gal2-card-bar mono">
                  <span className="gal2-card-cluster" style={{color: dom.color}}>■</span>
                  <span className="gal2-card-type">{ex.diag.id}</span>
                  <span className="sep">·</span>
                  <span className="gal2-card-std">§ {ex.diag.std}</span>
                </div>
                <div className="gal2-card-stage">
                  <DStub/>
                </div>
                <div className="gal2-card-foot">
                  <div className="gal2-card-title">{ex.title}</div>
                  <div className="gal2-card-desc">{ex.desc}</div>
                  <div className="gal2-card-tags mono">
                    {ex.uses.map(u => (
                      <span className="gal2-usepill" key={u}>{USE_CASES[u].label.toLowerCase()}</span>
                    ))}
                  </div>
                </div>
                <div className="gal2-card-open mono">open in playground →</div>
              </article>
            );
          })}
        </div>
      )}

      <div className="gal-cta">
        <div className="cta-lead">Need a diagram type we don't cover?</div>
        <div className="btn-row">
          <button className="btn">Open an issue ↗</button>
          <button className="btn primary" onClick={() => setRoute && setRoute('playground')}>Try the playground</button>
        </div>
      </div>

      <SiteFooter/>
    </div>
  );
}

function exampleTitles2(id) {
  const map = {
    genogram:  ['The Potter Family', 'Smith Three-Generation', 'Chen Adoption'],
    ladder:    ['Mode Selection', 'Conveyor Interlock', 'Fault Reset'],
    entity:    ['Acme Holdings Series A', 'Trust-over-LLC', 'Two-tier OpCo'],
    pedigree:  ['BRCA1 Cancer Family', 'Huntington 4-gen', 'Congenital deafness'],
    phylo:     ['Bacterial Diversity', 'Primate MRCA', 'HIV Strain Tree'],
    sld:       ['13.8 kV Substation', 'Campus Chiller Plant', 'Hospital ATS'],
    circuit:   ['CE Amp Netlist', 'Op-Amp Buffer', 'Bridge Rectifier'],
    logic:     ['1-bit Full Adder', '4-to-1 Mux', 'D Flip-flop'],
    timing:    ['SPI Transaction', 'I²C Read Burst', 'UART Frame'],
    ecomap:    ['Nguyen Resettlement', 'Rural Caregiver', 'Single-parent Household'],
    sociogram: ['Playground Dynamics', '6th Grade Cliques', 'Remote Team'],
    block:     ['PID Loop', 'Closed-loop Motor', 'Active Filter'],
    fishbone:  ['Line-03 Downtime', 'Defect Rate Q2', 'Hospital ER Delay']
  };
  return map[id] || ['Example A', 'Example B', 'Example C'];
}

// Replace original exports
Object.assign(window, {
  PlaygroundPage: PlaygroundPage2,
  GalleryPage: GalleryPage2
});
