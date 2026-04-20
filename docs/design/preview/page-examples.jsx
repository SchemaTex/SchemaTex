// page-examples.jsx — Examples page (featured + list)
// Depends on: shared.jsx (DIAGRAMS, DOMAINS), page-home.jsx (SiteFooter)
// Exposes: ExamplesPage

function ExamplesPage() {
  const featured = [
    { id: 'harry-potter-family', diag: 'genogram',
      title: 'The Potter Family Genogram',
      blurb: 'Three generations of the Potter/Evans family, including marital lines, deceased markers, an index person (Harry), and emotional-relationship lines (close to Lily, cutoff from Petunia, hostile to Dudley).' },
    { id: 'brca-cancer', diag: 'pedigree',
      title: 'BRCA1 Hereditary Breast/Ovarian Cancer',
      blurb: 'Clinical pedigree showing affected, carrier, and presymptomatic status across three generations. The proband arrow marks the index case.' },
    { id: 'acme-series-a', diag: 'entity',
      title: 'Acme Holdings — Series A Structure',
      blurb: 'Post-financing cap structure with a Delaware C-corp parent, a UK subsidiary, and a Cayman fund vehicle held 60% by the parent. Trust ownership at the top.' }
  ];

  const listItems = [
    { id: 'nuclear-family',      diag: 'genogram',  title: 'Nuclear family template' },
    { id: 'mode-selection',      diag: 'ladder',    title: 'System mode selection rung' },
    { id: 'ce-amp-netlist',      diag: 'circuit',   title: 'Common-emitter amplifier (netlist)' },
    { id: 'bacterial-diversity', diag: 'phylo',     title: 'Bacterial diversity tree' },
    { id: 'spi-transaction',     diag: 'timing',    title: 'SPI transaction waveform' },
    { id: '1bit-full-adder',     diag: 'logic',     title: '1-bit full adder' },
    { id: 'refugee-family',      diag: 'ecomap',    title: 'Nguyen family resettlement' },
    { id: 'playground-dynamics', diag: 'sociogram', title: 'Playground dynamics' },
    { id: '138kv-substation',    diag: 'sld',       title: '13.8 kV distribution substation' },
    { id: 'pid-loop',            diag: 'block',     title: 'Closed-loop PID motor' },
    { id: 'line03-downtime',     diag: 'fishbone',  title: 'Line-03 downtime analysis' },
    { id: 'huntington-4gen',     diag: 'pedigree',  title: "Huntington's — 4 generations" }
  ];

  return (
    <div className="page-wrap">
      <div className="page-hd">
        <div className="eye">/ EXAMPLES</div>
        <h1>Read the DSL. See the diagram.</h1>
        <p>Worked examples with source, commentary, and a link to open each one in the playground. Twenty-plus and counting.</p>
      </div>

      <div className="ex-featured">
        {featured.map((ex, i) => {
          const d = DIAGRAMS.find(x => x.id === ex.diag);
          const Stub = d.Stub;
          return (
            <article className="ex-item" key={ex.id}>
              <div className="ex-meta mono">
                <span className="ex-n">EX · {String(i+1).padStart(2, '0')}</span>
                <span className="ex-dot" style={{background: DOMAINS[d.dom].color}}/>
                <span>{d.name}</span>
                <span className="sep">/</span>
                <span>§ {d.std}</span>
              </div>
              <div className="ex-body">
                <div className="ex-prose">
                  <h2>{ex.title}</h2>
                  <p>{ex.blurb}</p>
                  <div className="ex-actions mono">
                    <span className="btn-mini">view source</span>
                    <span className="btn-mini">open in playground</span>
                    <span className="btn-mini">copy DSL</span>
                  </div>
                </div>
                <div className="ex-render">
                  <div className="ex-render-bar mono">
                    <div className="dots"><span/><span/><span/></div>
                    <span>{ex.id}.svg</span>
                  </div>
                  <div className="ex-render-stage"><Stub/></div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="ex-list-hd">
        <h3 className="mono">MORE EXAMPLES · {listItems.length}</h3>
      </div>
      <div className="ex-list">
        {listItems.map((ex) => {
          const d = DIAGRAMS.find(x => x.id === ex.diag);
          const Stub = d.Stub;
          return (
            <a className="ex-row" key={ex.id}>
              <div className="ex-row-thumb"><Stub/></div>
              <div className="ex-row-body">
                <div className="ex-row-title">{ex.title}</div>
                <div className="ex-row-meta mono">
                  <span style={{color: DOMAINS[d.dom].color}}>■</span>
                  {d.id}
                  <span className="sep">·</span>
                  § {d.std}
                </div>
              </div>
              <div className="ex-row-arrow mono">↗</div>
            </a>
          );
        })}
      </div>

      <SiteFooter/>
    </div>
  );
}

Object.assign(window, { ExamplesPage });
