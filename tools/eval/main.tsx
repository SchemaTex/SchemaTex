/** Visual Eval — the review surface for scripts/visual-eval.
 *
 * Reads two generated files — preview/visual-eval/report.json (every case and
 * its renders) and preview/visual-eval/exemplars.json (one hand-drawn drawing per
 * diagram variant) — plus two indexes bundled at build time: visual-eval/
 * variants.json (the types that can be drawn more than one way) and the diagram
 * registry (the cluster each type belongs to).
 *
 * The shape is coverage board → type → case. The board answers "what is still
 * missing"; a type page carries its exemplars and its cases; a case opens over
 * the grid it came from.
 */
import { Fragment, StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import variantIndex from "../../visual-eval/variants.json";
import { DIAGRAM_REGISTRY } from "../../src/ai/registry";

const REPORT_URL = "/preview/visual-eval/report.json";
const EXEMPLARS_URL = "/preview/visual-eval/exemplars.json";
const ASSETS = "/preview/visual-eval";

type Verdict = "pass" | "fail" | "unclear";
type Severity = "blocker" | "major" | "minor";
type RubricItem = { id: string; severity: Severity; must: string };
type Judged = { seconds: number; overall: string; model?: string; passes?: number; items: { id: string; verdict: Verdict; evidence: string }[] };
type Diagnostic = { severity: string; code?: string; message: string; line?: number };
type Version = {
  key: string; kind: "snapshot" | "next"; label: string; commit: string;
  dirty: boolean; status?: string; svgHash: string;
  diagnostics?: Diagnostic[]; judged: Judged | null;
};
type Ideal = { file: string; source: string; reviewed: boolean; notes?: string };
type Case = {
  id: string; type: string; variant?: string; title: string; goal: string; source?: string;
  rubric: RubricItem[]; ideal?: Ideal; hasIdeal: boolean; versions: Version[];
};
type Report = { generatedAt: string; judged: boolean; cases: Case[] };
type Exemplar = {
  type: string; variant?: string; title: string; notes: string; status: string;
  diagnostics: Diagnostic[];
};
type ExemplarSet = { generatedAt: string; engine: { version: string; commit: string; dirty: boolean }; entries: Exemplar[] };
type Side = "ideal" | "current";

type Variant = { id: string; label: string; about: string };
const VARIANTS: Record<string, Variant[]> = variantIndex;

const CLUSTER_OF = new Map<string, string>(DIAGRAM_REGISTRY.map((d) => [d.type, d.cluster]));
const CLUSTER_ORDER = [...new Set<string>(DIAGRAM_REGISTRY.map((d) => d.cluster)), "other"];
const CLUSTER_LABEL: Record<string, string> = {
  relationships: "Relationships",
  "electrical-industrial": "Electrical & industrial",
  "corporate-legal": "Corporate & legal",
  "causality-analysis": "Causality & analysis",
  generic: "General purpose",
  strategy: "Strategy",
  knowledge: "Knowledge",
  "behavior-modeling": "Behavior modeling",
  concurrency: "Concurrency",
  research: "Research",
  "project-management": "Project management",
  "network-infrastructure": "Network infrastructure",
  "software-uml": "Software & UML",
  "risk-reliability": "Risk & reliability",
  architecture: "Architecture & space",
  sports: "Sports",
  other: "Other",
};
const clusterOf = (type: string) => CLUSTER_OF.get(type) ?? "other";

/** exemplars/<type>/ for a type drawn one way, exemplars/<type>/<variant>/ otherwise. */
const folderOf = (type: string, variant?: string) => `${type}/${variant ? `${variant}/` : ""}`;
const exemplarImage = (e: Exemplar, side: Side) => `${ASSETS}/exemplars/${folderOf(e.type, e.variant)}${side}.png`;
const variantLabel = (type: string, id?: string) => VARIANTS[type]?.find((v) => v.id === id)?.label;

const WEIGHT: Record<Severity, number> = { blocker: 4, major: 2, minor: 1 };

type Score = { pct: number; blockers: number };
function scoreOf(rubric: RubricItem[], version?: Version | null): Score | null {
  if (!version?.judged) return null;
  const got = new Map(version.judged.items.map((i) => [i.id, i.verdict]));
  let earned = 0, total = 0, blockers = 0;
  for (const rule of rubric) {
    total += WEIGHT[rule.severity];
    if (got.get(rule.id) === "pass") earned += WEIGHT[rule.severity];
    if (got.get(rule.id) === "fail" && rule.severity === "blocker") blockers++;
  }
  return { pct: Math.round((earned / total) * 100), blockers };
}

function summarise(list: Case[], key: string): Score | null {
  const scores = list.map((c) => scoreOf(c.rubric, c.versions.find((v) => v.key === key))).filter(Boolean) as Score[];
  if (!scores.length) return null;
  return {
    pct: Math.round(scores.reduce((n, s) => n + s.pct, 0) / scores.length),
    blockers: scores.reduce((n, s) => n + s.blockers, 0),
  };
}

// ---------------------------------------------------------------- coverage

/** A place a drawing is owed: one per variant, or one for a type drawn one way. */
type Slot = {
  type: string; id?: string; label: string; about?: string;
  /** Cases the report holds without a variant — it predates variants.json. */
  stale?: boolean;
  cases: Case[]; reviewed: number; duplicates: number; exemplar?: Exemplar;
};
type TypeCoverage = { type: string; cluster: string; declared: boolean; slots: Slot[]; cases: Case[]; reviewed: number };

const isReviewed = (c: Case) => c.hasIdeal && Boolean(c.ideal?.reviewed);

/** A case's source without comments or titles. Two cases that agree on this
 *  draw the same picture twice: a placeholder that was copied, not a second test. */
function bodyOf(source: string) {
  const lines = source.split("\n").map((l) => l.trim())
    .filter((l) => l && !/^(#|%%|\/\/)/.test(l) && !/^title\s*:/.test(l));
  if (lines.length) lines[0] = lines[0]!.replace(/"[^"]*"/g, '""');
  return lines.join("\n");
}

function buildCoverage(cases: Case[], exemplars: Exemplar[]): TypeCoverage[] {
  const exemplarAt = new Map(exemplars.map((e) => [folderOf(e.type, e.variant), e]));
  return [...new Set(cases.map((c) => c.type))].map((type) => {
    const list = cases.filter((c) => c.type === type);
    const bodies = new Map<string, number>();
    for (const c of list) if (c.source) bodies.set(bodyOf(c.source), (bodies.get(bodyOf(c.source)) ?? 0) + 1);
    const duplicate = (c: Case) => Boolean(c.source) && (bodies.get(bodyOf(c.source!)) ?? 0) > 1;
    const slot = (mine: Case[], spec: { id?: string; label: string; about?: string; stale?: boolean }): Slot => ({
      type, ...spec, cases: mine,
      reviewed: mine.filter(isReviewed).length,
      duplicates: mine.filter(duplicate).length,
      exemplar: spec.stale ? undefined : exemplarAt.get(folderOf(type, spec.id)),
    });
    const declared = VARIANTS[type];
    const slots = declared
      ? declared.map((v) => slot(list.filter((c) => c.variant === v.id), v))
      : [slot(list, { label: type })];
    const stray = declared ? list.filter((c) => !declared.some((v) => v.id === c.variant)) : [];
    if (stray.length) slots.push(slot(stray, { label: "No variant", stale: true }));
    return { type, cluster: clusterOf(type), declared: Boolean(declared), slots, cases: list, reviewed: list.filter(isReviewed).length };
  }).sort((a, b) => CLUSTER_ORDER.indexOf(a.cluster) - CLUSTER_ORDER.indexOf(b.cluster) || a.type.localeCompare(b.type));
}

type NeedKind = "stale" | "duplicates" | "cases" | "exemplar" | "targets";
type Issue = { rank: number; kind: NeedKind; text: string };

/** The one most urgent thing a slot needs, in the order the work has to happen:
 *  a case set worth drawing for, then the exemplar, then the targets that copy it. */
function issueOf(s: Slot): Issue | null {
  if (s.stale) return { rank: -1, kind: "stale", text: `Rerun the eval: ${s.cases.length} case${s.cases.length === 1 ? " has" : "s have"} no variant` };
  if (s.duplicates) return { rank: 0, kind: "duplicates", text: `${s.duplicates} duplicate cases` };
  if (!s.cases.length) return { rank: 1, kind: "cases", text: "Needs cases" };
  if (s.cases.length < 2) return { rank: 2, kind: "cases", text: "Only one case" };
  if (!s.exemplar) return { rank: 3, kind: "exemplar", text: "Draw the exemplar" };
  if (s.reviewed < s.cases.length) return { rank: 4, kind: "targets", text: `${s.cases.length - s.reviewed} targets to draw` };
  return null;
}

const RANK_HEAD: Record<number, string> = { 1: "Needs cases", 2: "Only one case", 3: "Draw the exemplar", 4: "Targets to draw" };

/** A type with variants shows its most urgent issue, naming every variant that has it. */
function summaryIssue(slots: Slot[]): Issue | null {
  const found = slots.flatMap((s) => { const i = issueOf(s); return i ? [{ s, i }] : []; });
  if (!found.length) return null;
  const top = Math.min(...found.map((f) => f.i.rank));
  const hits = found.filter((f) => f.i.rank === top);
  const first = hits[0]!.i;
  if (first.kind === "stale") return first;
  if (first.kind === "duplicates") return { ...first, text: `${hits.reduce((n, h) => n + h.s.duplicates, 0)} duplicate cases` };
  return { ...first, text: `${RANK_HEAD[top]}: ${hits.map((h) => h.s.label).join(", ")}` };
}

// ---------------------------------------------------------------- small parts

const Glyph = ({ verdict }: { verdict: Verdict | "none" }) => {
  const label = { pass: "passes", fail: "fails", unclear: "unclear", none: "not graded" }[verdict];
  const body =
    verdict === "pass" ? <path d="M3 8.5l3.2 3.2L13 5" /> :
    verdict === "fail" ? <path d="M4 4l8 8M12 4l-8 8" /> :
    verdict === "unclear" ? <><path d="M5.5 5.8a2.5 2.5 0 1 1 3 2.4V10" /><circle cx="8.5" cy="12.4" r=".9" fill="currentColor" stroke="none" /></> :
    null;
  return body
    ? <><svg className={`g g-${verdict}`} viewBox="0 0 16 16" aria-hidden="true">{body}</svg><span className="sr">{label}</span></>
    : <><span className="g-none" aria-hidden="true">–</span><span className="sr">{label}</span></>;
};

const Pct = ({ score }: { score: Score | null }) =>
  score === null
    ? <span className="muted">not graded</span>
    : <span className={`pct${score.blockers ? " blocked" : ""}`}>{score.pct}%</span>;

const Dot = ({ on, label }: { on: boolean; label: string }) => (
  <svg className={on ? "dot dot-on" : "dot"} viewBox="0 0 10 10" role="img" aria-label={label}><title>{label}</title><circle cx="5" cy="5" r="4" /></svg>
);

const Chevron = ({ open }: { open: boolean }) => (
  <svg className={open ? "chev open" : "chev"} viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5 8 6l-3.5 3.5" /></svg>
);

const WarnGlyph = () => (
  <svg className="warn-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 14.3 13.5H1.7Z" /><path d="M8 6.4v3.4" /><circle cx="8" cy="11.7" r=".8" /></svg>
);

const Progress = ({ done, total }: { done: number; total: number }) => (
  <span className="progress" title={`${done} of ${total} cases have a reviewed target`}>
    <span className="track" aria-hidden="true"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
    <span className="mono">{done}/{total}</span>
  </span>
);

const NextStep = ({ issue }: { issue: Issue | null }) =>
  issue
    ? <span className={`need need-${issue.kind}`}>{issue.kind === "duplicates" || issue.kind === "stale" ? <WarnGlyph /> : null}{issue.text}</span>
    : <span className="need need-done">Complete</span>;

/** #/ , #/exemplars , #/<type> , #/<type>/<variant> , #/<type>[/<variant>]/<caseId> */
function useRoute() {
  const read = () => decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("/").filter(Boolean);
  const [route, setRoute] = useState<string[]>(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

/** The exemplar set is optional: an eval run is complete without it, so a
 *  missing manifest is "no exemplars yet", not an error. */
function useExemplars() {
  const [set, setSet] = useState<ExemplarSet | null>(null);
  useEffect(() => {
    fetch(EXEMPLARS_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: ExemplarSet | null) => setSet(s))
      .catch(() => setSet(null));
  }, []);
  return set;
}

function useReport() {
  const [state, setState] = useState<{ report?: Report; error?: string }>({});
  useEffect(() => {
    fetch(REPORT_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`))))
      .then((report: Report) => setState({ report }))
      .catch((e: Error) => setState({ error: e.message }));
  }, []);
  return state;
}

// ---------------------------------------------------------------- case view

/** One image in the comparison. Clicking it opens the full-size PNG in a new
 *  tab — a second dialog on top of the case dialog would stack badly. */
function Panel({ caseId, file, heading, sub, ideal }: {
  caseId: string; file: string | null; heading: string; sub: string; ideal?: boolean;
}) {
  const title = `${caseId} — ${heading}`;
  const src = file ? `${ASSETS}/${caseId}/${file}.png` : null;
  return (
    <figure className={ideal ? "panel panel-ideal" : "panel"}>
      <figcaption>
        <span className="panel-kind">{heading}</span>
        <span className="panel-sub">{sub}</span>
      </figcaption>
      {src ? (
        <a className="shot" href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={title} loading="lazy" />
        </a>
      ) : (
        <div className="empty">{sub}</div>
      )}
    </figure>
  );
}

function TargetNotice({ c }: { c: Case }) {
  if (!c.ideal)
    return <p className="banner">This case has no target drawing yet. The rubric still applies, but there is nothing to compare the render against.</p>;
  if (!c.ideal.reviewed)
    return <p className="banner">The target drawing for this case has not been reviewed yet, so treat its verdicts as provisional.</p>;
  return null;
}

const NONE = "__none__";

function Comparison({ c, left, right }: { c: Case; left: string; right: string }) {
  const find = (key: string) => (key === NONE ? null : c.versions.find((v) => v.key === key) ?? null);
  const l = find(left), r = find(right);
  const leftGot = new Map((l?.judged?.items ?? []).map((i) => [i.id, i]));
  const rightGot = new Map((r?.judged?.items ?? []).map((i) => [i.id, i]));
  const labelOf = (key: string, v: Version | null) => v?.label ?? key;
  // Two versions that hash to the same SVG drew the same picture, so showing
  // both is just noise: collapse to one panel and one verdict column.
  const same = Boolean(l && r && l.svgHash === r.svgHash);
  const showRight = right !== NONE && right !== left && !same;
  const bothLabel = same && l && r ? `${labelOf(left, l)} = ${labelOf(right, r)}` : "";
  const assessment = (showRight ? r : l)?.judged;
  return (
    <>
      <div className="strip">
        {c.hasIdeal ? (
          <Panel caseId={c.id} file="ideal" heading="Target" ideal
            sub={c.ideal ? `${c.ideal.source}${c.ideal.reviewed ? ", reviewed" : ", not reviewed"}` : ""} />
        ) : null}
        <Panel caseId={c.id} file={l ? l.key : null} heading={same ? bothLabel : labelOf(left, l)}
          sub={same ? "identical output — nothing changed between these versions"
                    : l ? l.commit + (l.dirty ? " + uncommitted" : "") : "not recorded for this case"} />
        {!showRight ? null : (
          <Panel caseId={c.id} file={r ? r.key : null} heading={labelOf(right, r)}
            sub={r ? r.commit + (r.dirty ? " + uncommitted" : "") : "not recorded for this case"} />
        )}
      </div>
      {assessment?.overall ? (
        <details className="source">
          <summary>Visual assessment{assessment.model ? ` · ${assessment.model}` : ""}{assessment.passes ? ` · ${assessment.passes} pass${assessment.passes === 1 ? "" : "es"}` : ""}</summary>
          <p className="lede">{assessment.overall}</p>
        </details>
      ) : null}
      <div className="scroll">
        <table className="rubric">
          <thead>
            <tr>
              <th scope="col">Rule</th><th scope="col">Weight</th>
              <th scope="col">{same ? bothLabel : labelOf(left, l)}</th>
              {showRight ? <th scope="col">{labelOf(right, r)}</th> : null}
              <th scope="col">What the judge saw</th>
            </tr>
          </thead>
          <tbody>
            {c.rubric.map((rule) => {
              const lv = leftGot.get(rule.id)?.verdict ?? "none";
              const rv = rightGot.get(rule.id)?.verdict ?? "none";
              const moved = lv !== "none" && rv !== "none" && lv !== rv;
              return (
                <tr key={rule.id} className={moved ? "moved" : undefined}>
                  <th scope="row"><code>{rule.id}</code><span className="must">{rule.must}</span></th>
                  <td className={`sev sev-${rule.severity}`}>{rule.severity}</td>
                  <td className="verdict"><Glyph verdict={same ? rv : lv} /></td>
                  {showRight ? <td className="verdict"><Glyph verdict={rv} /></td> : null}
                  <td className="evidence">{(showRight ? rightGot : leftGot).get(rule.id)?.evidence ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Source c={c} version={showRight ? r : l} />
    </>
  );
}

/** The DSL that produced these drawings, and what the engine said about it.
 *  A wrong picture is as often a wrong source as a wrong renderer. */
function Source({ c, version }: { c: Case; version: Version | null }) {
  const diagnostics = version?.diagnostics ?? [];
  if (!c.source && !diagnostics.length) return null;
  return (
    <details className="source">
      <summary>
        Source and diagnostics
        {version?.status && version.status !== "valid"
          ? <span className={`status status-${version.status}`}>{version.status}</span>
          : null}
        {diagnostics.length
          ? <span className="muted mono">{diagnostics.length} diagnostic{diagnostics.length > 1 ? "s" : ""}</span>
          : null}
      </summary>
      <DiagnosticList diagnostics={diagnostics} />
      {c.source ? <pre>{c.source}</pre> : null}
    </details>
  );
}

function DiagnosticList({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (!diagnostics.length) return null;
  return (
    <ul className="diagnostics">
      {diagnostics.map((d, i) => (
        <li key={i} className={`sev-${d.severity}`}>
          <code>{d.code ?? d.severity}</code>
          {d.line ? <span className="muted mono"> line {d.line}</span> : null}
          <span className="must">{d.message}</span>
        </li>
      ))}
    </ul>
  );
}

/** Another dialog is on top: the keys belong to it. */
const viewerOpen = () => Boolean(document.querySelector("dialog.viewer[open]"));

/** The case view: a comparison over the grid it came from. The URL names the
 *  open case, so a link can be shared and the back button closes it; the arrow
 *  keys walk the rest of the list, so many cases can be checked in a row. */
function CompareOverlay({ list, index, left, right, exemplarFor, onViewExemplar, onMove, onClose }: {
  list: Case[]; index: number; left: string; right: string;
  exemplarFor: (c: Case) => Exemplar | undefined;
  onViewExemplar: (e: Exemplar, side: Side) => void;
  onMove: (next: number) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const c = list[index];
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (c && !dialog.open) dialog.showModal();
    if (!c && dialog.open) dialog.close();
  }, [c]);
  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => {
      if (viewerOpen()) return;
      if (e.key === "ArrowRight" && index < list.length - 1) { e.preventDefault(); onMove(index + 1); }
      if (e.key === "ArrowLeft" && index > 0) { e.preventDefault(); onMove(index - 1); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [c, index, list.length, onMove]);
  if (!c) return <dialog className="overlay" ref={ref} onClose={onClose} />;
  const exemplar = exemplarFor(c);
  const variant = variantLabel(c.type, c.variant);
  return (
    <dialog className="overlay" ref={ref} onClose={onClose}>
      <div className="bar">
        <div>
          <strong>{c.title}</strong>
          <span className="tag" style={{ marginLeft: 8 }}>{c.type}{variant ? ` · ${variant}` : ""}</span>
          <span className="muted mono" style={{ marginLeft: 8 }}>{index + 1} of {list.length}</span>
        </div>
        <div className="bar-actions">
          <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label="Previous case">←</button>
          <button type="button" onClick={() => onMove(index + 1)} disabled={index === list.length - 1} aria-label="Next case">→</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
      <div className="overlay-body">
        <div className="overlay-intro">
          <p className="lede">{c.goal}</p>
          {exemplar ? (
            <button type="button" className="exemplar-ref" onClick={() => onViewExemplar(exemplar, "ideal")}>
              <img src={exemplarImage(exemplar, "ideal")} alt="" />
              <span><b>Exemplar{variant ? ` · ${variant}` : ""}</b><span>{exemplar.title}</span></span>
            </button>
          ) : null}
        </div>
        <TargetNotice c={c} />
        <Comparison c={c} left={left} right={right} />
      </div>
    </dialog>
  );
}

function CaseGrid({ cases, base, left, right }: { cases: Case[]; base: string; left: string; right: string }) {
  if (!cases.length) return <p className="muted">Nothing matches the current filter.</p>;
  return (
    <div className="grid">
      {cases.map((c) => {
        const version = c.versions.find((v) => v.key === right) ?? c.versions.find((v) => v.key === left) ?? c.versions.at(-1)!;
        const score = scoreOf(c.rubric, version);
        return (
          <a className="card" key={c.id} href={`${base}/${c.id}`}>
            <div className={c.hasIdeal ? "thumb thumb-pair" : "thumb"}>
              {c.hasIdeal ? (
                <figure><img src={`${ASSETS}/${c.id}/ideal.png`} alt="" loading="lazy" /><figcaption>target</figcaption></figure>
              ) : null}
              <figure><img src={`${ASSETS}/${c.id}/${version.key}.png`} alt="" loading="lazy" /><figcaption>{version.kind === "next" ? "next" : version.label}</figcaption></figure>
            </div>
            <div className="meta">
              <strong>{c.title}</strong>
              <div className="flags">
                {!c.hasIdeal ? <span className="flag flag-target">no target</span> : null}
                {c.hasIdeal && !c.ideal?.reviewed ? <span className="flag flag-target">target unreviewed</span> : null}
                {score?.blockers ? <span className="flag flag-blocker">{score.blockers} blocker</span> : null}
                <Pct score={score} />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

/** notes.md is short prose with an occasional "- " list and **bold** run; that
 *  is all the markdown this needs to understand. Anything else is left as
 *  written rather than half-rendered. */
const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> :
    part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> :
    part);

function Notes({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="notes">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*] /, ""))}</li>)}</ul>;
        if (/^#+ /.test(lines[0]!)) return <h3 key={i}>{lines[0]!.replace(/^#+ /, "")}</h3>;
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}

// ---------------------------------------------------------------- board

type Need = "all" | "exemplar" | "targets" | "cases" | "duplicates";
const NEEDS: [Need, string][] = [
  ["all", "Everything"], ["exemplar", "No exemplar"], ["targets", "Targets missing"],
  ["cases", "Too few cases"], ["duplicates", "Duplicate cases"],
];
const matchesNeed = (s: Slot, need: Need) =>
  need === "all" ||
  (need === "exemplar" && !s.stale && !s.exemplar) ||
  (need === "targets" && s.reviewed < s.cases.length) ||
  (need === "cases" && !s.stale && s.cases.length < 2) ||
  (need === "duplicates" && s.duplicates > 0);

/** The coverage board: what each type still needs, grouped by cluster, with a
 *  type that can be drawn several ways counted once per variant. */
function Board({ coverage, cases, query, left, right, versionLabel }: {
  coverage: TypeCoverage[]; cases: Case[]; query: string; left: string; right: string;
  versionLabel: (key: string) => string;
}) {
  const [need, setNeed] = useState<Need>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const q = query.trim().toLowerCase();
  const real = coverage.flatMap((t) => t.slots.filter((s) => !s.stale));
  const rows = coverage
    .filter((t) => !q || t.type.toLowerCase().includes(q))
    .map((t) => ({ ...t, shown: t.slots.filter((s) => matchesNeed(s, need)) }))
    .filter((t) => t.shown.length);
  const groups = CLUSTER_ORDER
    .map((cluster) => ({ cluster, types: rows.filter((t) => t.cluster === cluster) }))
    .filter((g) => g.types.length);
  const judged = cases.some((c) => c.versions.some((v) => v.key === left && v.judged));
  const withRight = judged && right !== NONE;
  const columns = 5 + (judged ? 1 : 0) + (withRight ? 2 : 0);
  const matchingCases = q ? cases.filter((c) => `${c.title} ${c.id}`.toLowerCase().includes(q)).slice(0, 60) : [];
  const filtering = need !== "all";
  const toggle = (type: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(type)) next.delete(type); else next.add(type);
    return next;
  });

  const scoreCells = (list: Case[]) => {
    if (!judged) return null;
    const l = summarise(list, left), r = withRight ? summarise(list, right) : null;
    const d = l && r ? r.pct - l.pct : null;
    return <>
      <td><Pct score={l} /></td>
      {withRight ? <>
        <td><Pct score={r} /></td>
        <td className={`delta ${d === null ? "" : d > 0 ? "up" : d < 0 ? "down" : "flat"}`}>
          {d === null ? <span className="muted">–</span> : d > 0 ? `+${d}` : String(d)}
        </td>
      </> : null}
    </>;
  };
  const exemplarDot = (s: Slot) =>
    <Dot on={Boolean(s.exemplar)} label={`${s.id ? `${s.label}: ` : ""}${s.exemplar ? "exemplar drawn" : "no exemplar"}`} />;

  return (
    <>
      <h1>Coverage</h1>
      <p className="lede">
        What each diagram type still needs before the engine can be measured against it. A type that can
        be drawn more than one way is counted per variant: each variant needs its own exemplar and its own cases.
      </p>
      <dl className="stats">
        <div><dt>Exemplars</dt><dd>{real.filter((s) => s.exemplar).length}<span> of {real.length} variants</span></dd></div>
        <div><dt>Reviewed targets</dt><dd>{coverage.reduce((n, t) => n + t.reviewed, 0)}<span> of {cases.length} cases</span></dd></div>
        <div><dt>Variants without cases</dt><dd>{real.filter((s) => !s.cases.length).length}</dd></div>
        <div><dt>Duplicate cases</dt><dd>{real.reduce((n, s) => n + s.duplicates, 0)}</dd></div>
      </dl>
      <div className="chips" role="group" aria-label="Show only">
        {NEEDS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={need === id} onClick={() => setNeed(id)}>{label}</button>
        ))}
      </div>
      {groups.length ? (
        <div className="scroll">
          <table className="board">
            <thead>
              <tr>
                <th scope="col">Type</th><th scope="col">Exemplar</th><th scope="col" className="num">Cases</th>
                <th scope="col">Reviewed targets</th>
                {judged ? <th scope="col">{versionLabel(left)}</th> : null}
                {withRight ? <><th scope="col">{versionLabel(right)}</th><th scope="col">Δ</th></> : null}
                <th scope="col">Next step</th>
              </tr>
            </thead>
            {groups.map((g) => {
              const slots = g.types.flatMap((t) => t.slots.filter((s) => !s.stale));
              return (
                <tbody key={g.cluster}>
                  <tr className="cluster-row">
                    <th scope="colgroup" colSpan={columns}>
                      <span className="cluster-name">{CLUSTER_LABEL[g.cluster] ?? g.cluster}</span>
                      <span className="cluster-meta">
                        exemplars {slots.filter((s) => s.exemplar).length}/{slots.length}
                        {" · "}targets {g.types.reduce((n, t) => n + t.reviewed, 0)}/{g.types.reduce((n, t) => n + t.cases.length, 0)}
                      </span>
                    </th>
                  </tr>
                  {g.types.map((t) => {
                    if (!t.declared && t.slots.length === 1) {
                      const s = t.slots[0]!;
                      return (
                        <tr key={t.type}>
                          <th scope="row"><span className="type-cell"><span className="chev-space" aria-hidden="true" /><a href={`#/${t.type}`}>{t.type}</a></span></th>
                          <td>{exemplarDot(s)}</td>
                          <td className="num mono">{t.cases.length}</td>
                          <td><Progress done={t.reviewed} total={t.cases.length} /></td>
                          {scoreCells(t.cases)}
                          <td><NextStep issue={issueOf(s)} /></td>
                        </tr>
                      );
                    }
                    const open = filtering || expanded.has(t.type);
                    const variants = t.slots.filter((s) => !s.stale);
                    return (
                      <Fragment key={t.type}>
                        <tr className="parent-row">
                          <th scope="row">
                            <span className="type-cell">
                              <button type="button" className="toggle" aria-expanded={open} disabled={filtering}
                                aria-label={`${open ? "Hide" : "Show"} the variants of ${t.type}`} onClick={() => toggle(t.type)}>
                                <Chevron open={open} />
                              </button>
                              <a href={`#/${t.type}`}>{t.type}</a>
                            </span>
                          </th>
                          <td>
                            <span className="dots">{variants.map((s) => <Fragment key={s.label}>{exemplarDot(s)}</Fragment>)}</span>
                            <span className="muted small">{variants.length} variants</span>
                          </td>
                          <td className="num mono">{t.cases.length}</td>
                          <td><Progress done={t.reviewed} total={t.cases.length} /></td>
                          {scoreCells(t.cases)}
                          <td><NextStep issue={summaryIssue(t.slots)} /></td>
                        </tr>
                        {open ? t.shown.map((s, i) => (
                          <tr key={s.label} className="variant-row">
                            <th scope="row">
                              <span className="type-cell variant-cell">
                                <span className="branch" aria-hidden="true">{i === t.shown.length - 1 ? "└" : "├"}</span>
                                {s.stale ? <span>{s.label}</span> : <a href={`#/${t.type}/${s.id}`} title={s.about}>{s.label}</a>}
                              </span>
                            </th>
                            <td>{s.stale ? null : exemplarDot(s)}</td>
                            <td className="num mono">{s.cases.length}</td>
                            <td><Progress done={s.reviewed} total={s.cases.length} /></td>
                            {scoreCells(s.cases)}
                            <td><NextStep issue={issueOf(s)} /></td>
                          </tr>
                        )) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      ) : <p className="muted">No type matches.</p>}
      {matchingCases.length ? (
        <>
          <h2 className="section" style={{ marginTop: 30 }}>Cases matching “{query.trim()}”</h2>
          <ul className="case-list">
            {matchingCases.map((c) => (
              <li key={c.id}><a href={`#/${c.type}/${c.id}`}>{c.title}</a> <span className="muted mono">{c.id}</span></li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- exemplars

function ExemplarSource({ folder }: { folder: string }) {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    fetch(`/visual-eval/exemplars/${folder}source.sx`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then(setText)
      .catch(() => setText(""));
  }, [folder]);
  return text ? <pre>{text}</pre> : <p className="muted">Source not available.</p>;
}

/** The exemplar beside what the engine draws from the same source today. */
function ExemplarBlock({ slot, engine, onView }: { slot: Slot; engine: string; onView: (e: Exemplar, side: Side) => void }) {
  const e = slot.exemplar;
  if (!e)
    return (
      <div className="exemplar-missing">
        <strong>No exemplar for {slot.id ? slot.label : slot.type} yet.</strong>
        <span>
          Draw one into <code>visual-eval/exemplars/{folderOf(slot.type, slot.id)}</code> — a <code>source.sx</code>,
          an <code>ideal.svg</code> and a <code>notes.md</code> — then run <code>scripts/visual-eval/exemplars.mts</code>.
        </span>
      </div>
    );
  return (
    <section className="exemplar">
      <div className="exemplar-head">
        <h2 className="section">Exemplar <span className="exemplar-name">{e.title}</span></h2>
        <button type="button" className="plain" onClick={() => onView(e, "ideal")}>Flip view</button>
      </div>
      <div className="strip">
        <figure className="panel panel-ideal">
          <figcaption><span className="panel-kind">Exemplar</span><span className="panel-sub">hand-drawn to the standard</span></figcaption>
          <button type="button" className="shot" onClick={() => onView(e, "ideal")}>
            <img src={exemplarImage(e, "ideal")} alt={`${e.title}, exemplar`} loading="lazy" />
          </button>
        </figure>
        <figure className="panel">
          <figcaption>
            <span className="panel-kind">Engine today</span>
            <span className="panel-sub">{engine}{e.status !== "valid" ? ` · ${e.status}` : ""}</span>
          </figcaption>
          <button type="button" className="shot" onClick={() => onView(e, "current")}>
            <img src={exemplarImage(e, "current")} alt={`${e.title}, engine render`} loading="lazy" />
          </button>
        </figure>
      </div>
      {e.notes ? <details className="source"><summary>Why it is drawn this way</summary><Notes text={e.notes} /></details> : null}
      <DiagnosticList diagnostics={e.diagnostics} />
      <details className="source"><summary>Source</summary><ExemplarSource folder={folderOf(e.type, e.variant)} /></details>
    </section>
  );
}

/** Exemplar and engine render in the same place, one at a time: flipping
 *  between two pictures that sit on the same spot shows every difference
 *  that a side-by-side makes the eye hunt for. */
function ExemplarViewer({ list, at, engine, onMove, onClose }: {
  list: Exemplar[]; at: { index: number; side: Side } | null; engine: string;
  onMove: (next: { index: number; side: Side }) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const e = at ? list[at.index] : undefined;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // showModal focuses the first button; Space on a focused button is that
    // button's own click, which would undo the flip. Start on the picture.
    if (e && !dialog.open) { dialog.showModal(); stage.current?.focus(); }
    if (!e && dialog.open) dialog.close();
  }, [e]);
  useEffect(() => {
    if (!at || !e) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === " " && !(ev.target instanceof HTMLButtonElement)) { ev.preventDefault(); onMove({ ...at, side: at.side === "ideal" ? "current" : "ideal" }); }
      if (ev.key === "ArrowRight" && at.index < list.length - 1) { ev.preventDefault(); onMove({ ...at, index: at.index + 1 }); }
      if (ev.key === "ArrowLeft" && at.index > 0) { ev.preventDefault(); onMove({ ...at, index: at.index - 1 }); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [at, e, list.length, onMove]);
  if (!at || !e) return <dialog className="overlay viewer" ref={ref} onClose={onClose} />;
  const label = variantLabel(e.type, e.variant);
  return (
    <dialog className="overlay viewer" ref={ref} onClose={onClose}>
      <div className="bar">
        <div className="viewer-title">
          <strong>{e.title}</strong>
          <span className="tag">{e.type}{label ? ` · ${label}` : ""}</span>
          <span className="muted mono">{at.index + 1} of {list.length}</span>
        </div>
        <div className="bar-actions">
          <div className="seg" role="group" aria-label="Which drawing">
            <button type="button" aria-pressed={at.side === "ideal"} onClick={() => onMove({ ...at, side: "ideal" })}>Exemplar</button>
            <button type="button" aria-pressed={at.side === "current"} onClick={() => onMove({ ...at, side: "current" })}>Engine today</button>
          </div>
          <span className="hint">Space flips · ← → moves</span>
          <button type="button" onClick={() => onMove({ ...at, index: at.index - 1 })} disabled={at.index === 0} aria-label="Previous exemplar">←</button>
          <button type="button" onClick={() => onMove({ ...at, index: at.index + 1 })} disabled={at.index === list.length - 1} aria-label="Next exemplar">→</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
      <div className="viewer-stage" ref={stage} tabIndex={-1}>
        <img src={exemplarImage(e, "ideal")} alt={`${e.title}, exemplar`} className={at.side === "ideal" ? undefined : "hidden-side"} />
        <img src={exemplarImage(e, "current")} alt={`${e.title}, engine render`} className={at.side === "current" ? undefined : "hidden-side"} />
        <p className="viewer-caption mono">{at.side === "ideal" ? "Exemplar · hand-drawn to the standard" : `Engine today · ${engine}`}</p>
      </div>
    </dialog>
  );
}

function ExemplarGallery({ coverage, flat, onView }: {
  coverage: TypeCoverage[]; flat: Exemplar[]; onView: (e: Exemplar, side: Side) => void;
}) {
  const groups = CLUSTER_ORDER
    .map((cluster) => ({ cluster, slots: coverage.filter((t) => t.cluster === cluster).flatMap((t) => t.slots.filter((s) => s.exemplar)) }))
    .filter((g) => g.slots.length);
  return (
    <>
      <p className="crumb"><a href="#/">Coverage</a></p>
      <h1>Exemplars</h1>
      <p className="lede">
        One hand-drawn drawing per diagram variant, drawn to the published standard: the look the engine is
        aiming at, and the look every case target in that variant copies. {flat.length} drawn so far.
      </p>
      {flat.length ? <p><button type="button" className="primary" onClick={() => onView(flat[0]!, "ideal")}>Flip through all {flat.length}</button></p> : null}
      {groups.map((g) => (
        <section key={g.cluster} className="gallery-group">
          <h2 className="section">{CLUSTER_LABEL[g.cluster] ?? g.cluster}</h2>
          <div className="exemplar-grid">
            {g.slots.map((s) => {
              const e = s.exemplar!;
              return (
                <a key={folderOf(s.type, s.id)} className="exemplar-card" href={`#/${s.type}${s.id ? `/${s.id}` : ""}`}>
                  <img src={exemplarImage(e, "ideal")} alt="" loading="lazy" />
                  <span className="exemplar-type">{s.type}{s.id ? ` · ${s.label}` : ""}</span>
                  <span className="exemplar-title">{e.title}</span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- type page

function TypePage({ type, variant, cov, list, engine, left, right, onView }: {
  type: string; variant?: string; cov?: TypeCoverage; list: Case[]; engine: string;
  left: string; right: string; onView: (e: Exemplar, side: Side) => void;
}) {
  const declared = VARIANTS[type];
  const variants = cov?.slots.filter((s) => !s.stale) ?? [];
  const slot = declared ? variants.find((s) => s.id === variant) : variants[0];
  const base = `#/${type}${variant ? `/${variant}` : ""}`;
  const total = cov?.cases.length ?? 0;
  return (
    <>
      <p className="crumb"><a href="#/">Coverage</a> / {CLUSTER_LABEL[clusterOf(type)] ?? clusterOf(type)}</p>
      <h1>{type}</h1>
      <p className="lede">
        {total} case{total === 1 ? "" : "s"}.
        {declared ? ` Drawn ${declared.length} ways; each variant parses different data and has its own exemplar.` : ""}
      </p>
      {declared ? (
        <nav className="tabs" aria-label={`${type} variants`}>
          <a href={`#/${type}`} aria-current={!variant ? "page" : undefined}>All<span className="count">{total}</span></a>
          {variants.map((s) => (
            <a key={s.id} href={`#/${type}/${s.id}`} aria-current={variant === s.id ? "page" : undefined}>
              <Dot on={Boolean(s.exemplar)} label={s.exemplar ? "exemplar drawn" : "no exemplar"} />
              {s.label}<span className="count">{s.cases.length}</span>
            </a>
          ))}
        </nav>
      ) : null}
      {declared && slot?.about ? <p className="variant-about-line">{slot.about}</p> : null}
      {declared && !variant ? (
        <div className="variant-cards">
          {variants.map((s) => (
            <a key={s.id} className="variant-card" href={`#/${type}/${s.id}`}>
              <span className="variant-thumb">
                {s.exemplar ? <img src={exemplarImage(s.exemplar, "ideal")} alt="" loading="lazy" /> : <span className="no-thumb">No exemplar yet</span>}
              </span>
              <span className="variant-label">{s.label}</span>
              <span className="variant-about">{s.about}</span>
              <span className="variant-meta">{s.cases.length} case{s.cases.length === 1 ? "" : "s"} · {s.reviewed} reviewed</span>
            </a>
          ))}
        </div>
      ) : slot ? (
        <ExemplarBlock slot={slot} engine={engine} onView={onView} />
      ) : null}
      <h2 className="section">Cases{declared && slot && variant ? ` · ${slot.label}` : ""}</h2>
      <CaseGrid cases={list} base={base} left={left} right={right} />
    </>
  );
}

// ---------------------------------------------------------------- app

function Rail({ coverage, routeType, onBoard, onGallery, caseCount, exemplarCount }: {
  coverage: TypeCoverage[]; routeType?: string; onBoard: boolean; onGallery: boolean;
  caseCount: number; exemplarCount: number;
}) {
  const groups = CLUSTER_ORDER
    .map((cluster) => ({ cluster, types: coverage.filter((t) => t.cluster === cluster) }))
    .filter((g) => g.types.length);
  return (
    <aside className="rail">
      <nav className="rail-top">
        <a href="#/" className={onBoard ? "current" : undefined}>Coverage<span className="count">{caseCount}</span></a>
        <a href="#/exemplars" className={onGallery ? "current" : undefined}>Exemplars<span className="count">{exemplarCount}</span></a>
      </nav>
      {groups.map((g) => (
        <details key={g.cluster} open>
          <summary>{CLUSTER_LABEL[g.cluster] ?? g.cluster}</summary>
          <nav>
            {g.types.map((t) => (
              <a key={t.type} href={`#/${t.type}`} className={routeType === t.type ? "current" : undefined}>
                {t.type}
                <span className="bar" title={`${t.reviewed} of ${t.cases.length} cases have a reviewed target drawing`}>
                  <i style={{ width: `${t.cases.length ? (t.reviewed / t.cases.length) * 100 : 0}%`, background: "var(--accent)" }} />
                </span>
                <span className="count">{t.cases.length}</span>
              </a>
            ))}
          </nav>
        </details>
      ))}
    </aside>
  );
}

function App() {
  const { report, error } = useReport();
  const exemplarSet = useExemplars();
  const route = useRoute();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "failing" | "no-target">("all");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [viewer, setViewer] = useState<{ index: number; side: Side } | null>(null);

  const versionKeys = useMemo(() => {
    const keys: string[] = [];
    for (const c of report?.cases ?? []) for (const v of c.versions) if (!keys.includes(v.key)) keys.push(v.key);
    return keys;
  }, [report]);
  const versionLabel = (key: string) => {
    for (const c of report?.cases ?? []) {
      const hit = c.versions.find((v) => v.key === key);
      if (hit) return hit.label;
    }
    return key;
  };
  // Default view is the target beside the released engine. "next" — the working
  // tree — is opt-in, because most of the time the question is "how good is what
  // we ship", not "what did I just change".
  const currentKey = useMemo(() => {
    for (const c of report?.cases ?? [])
      for (const v of [...c.versions].reverse()) if (v.kind === "snapshot") return v.key;
    return versionKeys[0];
  }, [report, versionKeys]);
  // Show the working tree beside the release only when it actually draws
  // something different — otherwise the third panel is the same picture twice.
  const nextDiffers = useMemo(
    () => (report?.cases ?? []).some((c) => {
      const released = c.versions.find((v) => v.kind === "snapshot");
      const next = c.versions.find((v) => v.kind === "next");
      return released && next && released.svgHash !== next.svgHash;
    }),
    [report],
  );
  useEffect(() => {
    if (!currentKey) return;
    setLeft((v) => v || currentKey);
    setRight((v) => v || (nextDiffers ? "next" : NONE));
  }, [currentKey, nextDiffers]);
  const coverage = useMemo(
    () => (report ? buildCoverage(report.cases, exemplarSet?.entries ?? []) : []),
    [report, exemplarSet],
  );
  const flat = useMemo(() => coverage.flatMap((t) => t.slots.flatMap((s) => (s.exemplar ? [s.exemplar] : []))), [coverage]);

  if (error) return <p style={{ padding: 24 }}>Could not read {REPORT_URL} ({error}). Run <code>vite-node scripts/visual-eval/run.mts</code> first.</p>;
  if (!report) return <p style={{ padding: 24 }} className="muted">Loading…</p>;

  const engine = exemplarSet ? `${exemplarSet.engine.version} @ ${exemplarSet.engine.commit}${exemplarSet.engine.dirty ? " + uncommitted" : ""}` : "";
  const openExemplar = (e: Exemplar, side: Side) => {
    const index = flat.indexOf(e);
    if (index >= 0) setViewer({ index, side });
  };
  const exemplarFor = (c: Case) =>
    coverage.find((t) => t.type === c.type)?.slots.find((s) => !s.stale && (!VARIANTS[c.type] || s.id === c.variant))?.exemplar;

  const matches = (c: Case) => {
    if (query && !(`${c.title} ${c.id} ${c.type}`.toLowerCase().includes(query.toLowerCase()))) return false;
    if (filter === "no-target") return !c.hasIdeal || !c.ideal?.reviewed;
    if (filter === "failing") {
      const s = scoreOf(c.rubric, c.versions.find((v) => v.key === right));
      return s !== null && (s.blockers > 0 || s.pct < 100);
    }
    return true;
  };
  const [head, second, third] = route;
  const onGallery = head === "exemplars";
  const routeType = head && !onGallery ? head : undefined;
  const routeVariant = routeType && VARIANTS[routeType]?.some((v) => v.id === second) ? second : undefined;
  const routeCase = routeType ? (routeVariant ? third : second) : undefined;
  const base = routeType ? `#/${routeType}${routeVariant ? `/${routeVariant}` : ""}` : "#";
  // A case in the URL means "its type's grid, with that case open over it", so
  // every case has a link that can be shared and the back button closes it.
  const listForType = routeType
    ? report.cases.filter((c) => c.type === routeType && (!routeVariant || c.variant === routeVariant) && matches(c))
    : [];
  const openIndex = routeCase ? listForType.findIndex((c) => c.id === routeCase) : -1;
  const goToCase = (next: number) => {
    const target = listForType[next];
    // Arrowing through cases replaces the entry rather than stacking one per
    // case, so closing always lands back on the grid.
    if (target) location.replace(`${base}/${target.id}`);
  };

  return (
    <>
      <header className="top">
        <div className="brand">Visual Eval<span>{report.generatedAt} · judge {report.judged ? "on" : "off"}</span></div>
        <div className="controls">
          <div className="field"><label htmlFor="q">Search</label>
            <input id="q" type="search" value={query} placeholder={routeType ? "case" : "type or case"}
              onChange={(e) => setQuery(e.target.value)} /></div>
          {routeType ? (
            <div className="field"><label htmlFor="f">Show</label>
              <select id="f" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
                <option value="all">Everything</option>
                <option value="failing">Not fully passing</option>
                <option value="no-target">Missing or unreviewed target</option>
              </select></div>
          ) : null}
          <div className="field"><label htmlFor="l">Version</label>
            <select id="l" value={left} onChange={(e) => setLeft(e.target.value)}>
              {versionKeys.map((k) => <option key={k} value={k}>{versionLabel(k)}</option>)}
            </select></div>
          <div className="field"><label htmlFor="r">Compare with</label>
            <select id="r" value={right} onChange={(e) => setRight(e.target.value)}>
              <option value={NONE}>nothing</option>
              {versionKeys.map((k) => <option key={k} value={k}>{versionLabel(k)}</option>)}
            </select></div>
        </div>
      </header>
      <div className="layout">
        <Rail coverage={coverage} routeType={routeType} onBoard={!head} onGallery={onGallery}
          caseCount={report.cases.length} exemplarCount={flat.length} />
        <main>
          {onGallery ? (
            <ExemplarGallery coverage={coverage} flat={flat} onView={openExemplar} />
          ) : routeType ? (
            <TypePage type={routeType} variant={routeVariant} cov={coverage.find((t) => t.type === routeType)}
              list={listForType} engine={engine} left={left} right={right} onView={openExemplar} />
          ) : (
            <Board coverage={coverage} cases={report.cases} query={query} left={left} right={right} versionLabel={versionLabel} />
          )}
        </main>
      </div>
      <CompareOverlay
        list={listForType} index={openIndex} left={left} right={right}
        exemplarFor={exemplarFor} onViewExemplar={openExemplar}
        onMove={goToCase}
        // The dialog also fires close when the route moves off the case; only a
        // close the reader asked for should walk the history back.
        onClose={() => { if (routeCase) history.back(); }} />
      <ExemplarViewer list={flat} at={viewer} engine={engine} onMove={setViewer} onClose={() => setViewer(null)} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
