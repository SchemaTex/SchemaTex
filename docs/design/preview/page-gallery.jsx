// page-gallery.jsx — Gallery page (filterable example grid)
// Depends on: shared.jsx (DIAGRAMS, DOMAINS), page-home.jsx (SiteFooter)
// Exposes: GalleryPage, USE_CASE_MAP, USE_CASES, DIAGRAM_DESC

// ================================================================
// USE-CASE TAXONOMY
// ================================================================

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

// One-line description per diagram type (shown on gallery cards)
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

// Three realistic example titles per diagram type
function exampleTitles(id) {
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

// ================================================================
// GALLERY PAGE
// ================================================================

function GalleryPage({ setRoute }) {
  const [cluster, setCluster] = React.useState('all');
  const [useCase, setUseCase] = React.useState('all');
  const [query, setQuery] = React.useState('');

  const allExamples = React.useMemo(() => {
    const items = [];
    DIAGRAMS.forEach(d => {
      exampleTitles(d.id).forEach((t, i) => {
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
            {anyFilter && <> <span className="sep">·</span> filtered from {allExamples.length}</>}
          </span>
          {anyFilter && (
            <button className="gal2-reset" onClick={resetAll}>reset filters ×</button>
          )}
        </div>
      </div>

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

Object.assign(window, { GalleryPage, USE_CASE_MAP, USE_CASES, DIAGRAM_DESC });
