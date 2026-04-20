// page-playground.jsx — Playground page (DSL editor with live preview)
// Depends on: shared.jsx (DIAGRAMS, DOMAINS), page-home.jsx (SiteFooter)
// Exposes: PlaygroundPage

// ================================================================
// DSL SOURCE TEXT — full examples for the editor (one per diagram)
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
// SYNTAX HIGHLIGHTER — line-by-line regex tokenizer for the editor
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

function PlaygroundPage() {
  const [active, setActive] = React.useState(() => {
    try { return localStorage.getItem('schematex.pg.active') || 'genogram'; }
    catch(e) { return 'genogram'; }
  });
  const [source, setSource] = React.useState(() => DSL_TEXT[active] || DSL_TEXT.genogram);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [shareState, setShareState] = React.useState('idle');
  const editorRef = React.useRef(null);

  React.useEffect(() => {
    setSource(DSL_TEXT[active] || '');
    try { localStorage.setItem('schematex.pg.active', active); } catch(e) {}
  }, [active]);

  const diag = DIAGRAMS.find(d => d.id === active);
  const Stub = diag.Stub;
  const lines = source.split('\n');

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
    console.log('export', fmt);
  };

  return (
    <div className="page-wrap pg-wrap">
      <div className="page-hd pg-hd">
        <div className="eye">/ PLAYGROUND</div>
        <h1>Live editor</h1>
        <p>Edit the DSL on the left. Diagram re-renders on the right. Pick a preset below to start from a real example, or share your current source as a permalink.</p>
      </div>

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

Object.assign(window, { PlaygroundPage, DSL_TEXT, highlightLine });
