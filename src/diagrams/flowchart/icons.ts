/**
 * Built-in flowchart node icons (B-5).
 *
 * Each icon is stroke-based line art centred at the origin within a ~22×22 box
 * (roughly -11..11). The renderer translates it into the top of a node and
 * lets CSS (`.sx-fc-icon` / `.sx-fc-icon-fill`) drive the colour, so icons
 * inherit the theme. Zero runtime deps — every glyph is hand-written SVG,
 * consistent with the rest of Schematex.
 */

export const ICON_SIZE = 22;
export const ICON_GAP = 4;

type IconFn = () => string;

const s = `class="sx-fc-icon" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
const sf = `class="sx-fc-icon-fill"`;

// Toothed gear built programmatically: a hub ring + 8 flat-top teeth at the rim.
function gearGlyph(): string {
  let teeth = "";
  for (let i = 0; i < 8; i++) {
    teeth += `<rect x="-1.8" y="-10.4" width="3.6" height="3.6" rx="0.6" transform="rotate(${i * 45})" ${sf}/>`;
  }
  return `<circle cx="0" cy="0" r="7" ${s}/>${teeth}<circle cx="0" cy="0" r="2.6" ${s}/>`;
}

const ICONS: Record<string, IconFn> = {
  // ── core (original set) ──────────────────────────────────────
  server: () =>
    `<rect x="-10" y="-9" width="20" height="7" rx="1.5" ${s}/>` +
    `<rect x="-10" y="2" width="20" height="7" rx="1.5" ${s}/>` +
    `<circle cx="-6" cy="-5.5" r="0.9" ${sf}/><circle cx="-6" cy="5.5" r="0.9" ${sf}/>`,
  database: () =>
    `<ellipse cx="0" cy="-7" rx="9" ry="3.2" ${s}/>` +
    `<path d="M -9 -7 V 7 C -9 8.8 -5 10 0 10 C 5 10 9 8.8 9 7 V -7" ${s}/>` +
    `<path d="M -9 0 C -9 1.8 -5 3 0 3 C 5 3 9 1.8 9 0" ${s}/>`,
  user: () =>
    `<circle cx="0" cy="-4" r="4" ${s}/><path d="M -8 10 C -8 3 8 3 8 10" ${s}/>`,
  cloud: () =>
    `<path d="M -7 5 C -11 5 -11 -2 -6 -2 C -6 -8 5 -8 5 -2 C 10 -3 11 5 6 5 Z" ${s}/>`,
  gear: gearGlyph,
  document: () =>
    `<path d="M -7 -10 H 3 L 7 -6 V 10 H -7 Z" ${s}/>` +
    `<path d="M 3 -10 V -6 H 7 M -4 0 H 4 M -4 4 H 4" ${s}/>`,
  globe: () =>
    `<circle cx="0" cy="0" r="9" ${s}/>` +
    `<path d="M -9 0 H 9 M 0 -9 V 9 M 0 -9 C -5 -4 -5 4 0 9 C 5 4 5 -4 0 -9" ${s}/>`,
  lock: () =>
    `<rect x="-7" y="-1" width="14" height="11" rx="1.5" ${s}/>` +
    `<path d="M -4 -1 V -4 C -4 -9 4 -9 4 -4 V -1" ${s}/>`,
  mail: () =>
    `<rect x="-10" y="-7" width="20" height="14" rx="1.5" ${s}/>` +
    `<path d="M -10 -6 L 0 2 L 10 -6" ${s}/>`,
  clock: () => `<circle cx="0" cy="0" r="9" ${s}/><path d="M 0 -5 V 0 L 4 3" ${s}/>`,
  check: () => `<circle cx="0" cy="0" r="9" ${s}/><path d="M -4 0 L -1 3 L 5 -4" ${s}/>`,
  alert: () =>
    `<path d="M 0 -9 L 10 8 H -10 Z" ${s}/>` +
    `<path d="M 0 -3 V 2" ${s}/><circle cx="0" cy="5" r="0.9" ${sf}/>`,
  process: () =>
    `<rect x="-9" y="-7" width="18" height="14" rx="1.5" ${s}/>` +
    `<path d="M -5 -2 H 5 M -5 2 H 2" ${s}/>`,
  queue: () =>
    `<rect x="-10" y="-6" width="6" height="12" rx="1" ${s}/>` +
    `<rect x="-2" y="-6" width="6" height="12" rx="1" ${s}/>` +
    `<rect x="6" y="-6" width="4" height="12" rx="1" ${s}/>`,

  // ── Tier 1 · general flow ────────────────────────────────────
  folder: () => `<path d="M -10 -6 H -3 L -1 -3 H 10 V 8 H -10 Z" ${s}/>`,
  file: () =>
    `<path d="M -7 -10 H 3 L 7 -6 V 10 H -7 Z" ${s}/><path d="M 3 -10 V -6 H 7" ${s}/>`,
  search: () =>
    `<circle cx="-2" cy="-2" r="6" ${s}/><path d="M 2.5 2.5 L 9 9" ${s}/>`,
  edit: () =>
    `<path d="M -9 9 H -5 L 7 -3 L 3 -7 L -9 5 Z" ${s}/><path d="M 2 -6 L 6 -2" ${s}/>`,
  trash: () =>
    `<path d="M -8 -5 H 8 M -6 -5 V 8 C -6 9 -5 9 -4 9 H 4 C 5 9 6 9 6 8 V -5 M -3 -5 V -8 H 3 V -5 M -2 -1 V 5 M 2 -1 V 5" ${s}/>`,
  add: () => `<circle cx="0" cy="0" r="9" ${s}/><path d="M -4 0 H 4 M 0 -4 V 4" ${s}/>`,
  sync: () =>
    `<path d="M -8 -1 A 8 8 0 0 1 6 -5" ${s}/><path d="M 6 -5 L 7 -8 M 6 -5 L 3 -6" ${s}/>` +
    `<path d="M 8 1 A 8 8 0 0 1 -6 5" ${s}/><path d="M -6 5 L -7 8 M -6 5 L -3 6" ${s}/>`,
  upload: () =>
    `<path d="M -8 6 V 9 H 8 V 6" ${s}/><path d="M 0 -9 V 3 M -4 -5 L 0 -9 L 4 -5" ${s}/>`,
  download: () =>
    `<path d="M -8 6 V 9 H 8 V 6" ${s}/><path d="M 0 -9 V 3 M -4 -1 L 0 3 L 4 -1" ${s}/>`,
  link: () =>
    `<path d="M -1 -4 L -5 0 A 4.2 4.2 0 0 0 1 6 L 3 4" ${s}/>` +
    `<path d="M 1 4 L 5 0 A 4.2 4.2 0 0 0 -1 -6 L -3 -4" ${s}/>`,
  calendar: () =>
    `<rect x="-9" y="-7" width="18" height="15" rx="1.5" ${s}/>` +
    `<path d="M -9 -2 H 9 M -4 -10 V -4 M 4 -10 V -4" ${s}/>`,
  list: () =>
    `<circle cx="-8" cy="-6" r="1.2" ${sf}/><circle cx="-8" cy="0" r="1.2" ${sf}/><circle cx="-8" cy="6" r="1.2" ${sf}/>` +
    `<path d="M -4 -6 H 9 M -4 0 H 9 M -4 6 H 9" ${s}/>`,
  filter: () => `<path d="M -9 -7 H 9 L 2 1 V 9 L -2 7 V 1 Z" ${s}/>`,
  flag: () => `<path d="M -7 -9 V 9 M -7 -9 H 7 L 4 -5 L 7 -1 H -7" ${s}/>`,
  star: () =>
    `<path d="M 0 -9 L 2.6 -2.8 L 9 -2.4 L 4 1.8 L 5.6 8.4 L 0 5 L -5.6 8.4 L -4 1.8 L -9 -2.4 L -2.6 -2.8 Z" ${s}/>`,
  tag: () =>
    `<path d="M 1 -8 H 9 V 0 L 0 9 L -9 0 L 1 -8 Z" ${s}/><circle cx="5.5" cy="-4.5" r="1.4" ${sf}/>`,
  info: () =>
    `<circle cx="0" cy="0" r="9" ${s}/><circle cx="0" cy="-4" r="1" ${sf}/><path d="M 0 -1 V 5" ${s}/>`,
  question: () =>
    `<circle cx="0" cy="0" r="9" ${s}/><path d="M -3 -3 A 3 3 0 1 1 1 1 V 3" ${s}/><circle cx="0.5" cy="6" r="1" ${sf}/>`,
  cancel: () =>
    `<circle cx="0" cy="0" r="9" ${s}/><path d="M -4 -4 L 4 4 M 4 -4 L -4 4" ${s}/>`,
  play: () => `<circle cx="0" cy="0" r="9" ${s}/><path d="M -3 -5 L 5 0 L -3 5 Z" ${sf}/>`,
  stop: () =>
    `<path d="M -3.5 -8 H 3.5 L 8 -3.5 V 3.5 L 3.5 8 H -3.5 L -8 3.5 V -3.5 Z" ${s}/>`,

  // ── Tier 2 · tech / architecture ─────────────────────────────
  code: () => `<path d="M -3 -7 L -9 0 L -3 7 M 3 -7 L 9 0 L 3 7" ${s}/>`,
  terminal: () =>
    `<rect x="-10" y="-7" width="20" height="14" rx="1.5" ${s}/>` +
    `<path d="M -6 -2 L -2 1 L -6 4 M 0 4 H 5" ${s}/>`,
  container: () =>
    `<path d="M 0 -9 L 9 -4 V 5 L 0 10 L -9 5 V -4 Z" ${s}/>` +
    `<path d="M -9 -4 L 0 1 L 9 -4 M 0 1 V 10" ${s}/>`,
  cache: () =>
    `<rect x="-9" y="-7" width="18" height="14" rx="1.5" ${s}/>` +
    `<path d="M 1 -4 L -3 1 H 0 L -1 4 L 3 -1 H 0 Z" ${sf}/>`,
  shield: () =>
    `<path d="M 0 -9 L 8 -6 V 1 C 8 7 0 10 0 10 C 0 10 -8 7 -8 1 V -6 Z" ${s}/>` +
    `<path d="M -3 -0.5 L -1 1.5 L 3.5 -3" ${s}/>`,
  key: () =>
    `<circle cx="-4" cy="-4" r="4" ${s}/><path d="M -1 -1 L 7 7 M 4 4 L 7 1 M 7 7 L 4 10" ${s}/>`,
  browser: () =>
    `<rect x="-10" y="-8" width="20" height="16" rx="1.5" ${s}/>` +
    `<path d="M -10 -3 H 10" ${s}/><circle cx="-7" cy="-5.5" r="0.9" ${sf}/><circle cx="-4" cy="-5.5" r="0.9" ${sf}/>`,
  mobile: () =>
    `<rect x="-6" y="-9" width="12" height="18" rx="2" ${s}/><path d="M -2 6 H 2" ${s}/>`,
  desktop: () =>
    `<rect x="-10" y="-8" width="20" height="13" rx="1.5" ${s}/><path d="M -4 9 H 4 M 0 5 V 9" ${s}/>`,
  cpu: () =>
    `<rect x="-6" y="-6" width="12" height="12" rx="1" ${s}/><rect x="-2.5" y="-2.5" width="5" height="5" ${s}/>` +
    `<path d="M -3 -6 V -9 M 0 -6 V -9 M 3 -6 V -9 M -3 6 V 9 M 0 6 V 9 M 3 6 V 9 M -6 -3 H -9 M -6 0 H -9 M -6 3 H -9 M 6 -3 H 9 M 6 0 H 9 M 6 3 H 9" ${s}/>`,
  "git-branch": () =>
    `<circle cx="-5" cy="-6" r="2.5" ${s}/><circle cx="-5" cy="7" r="2.5" ${s}/><circle cx="5" cy="-6" r="2.5" ${s}/>` +
    `<path d="M -5 -3.5 V 4.5 M -5 0 C -5 -4 5 -2 5 -3.5" ${s}/>`,
  bug: () =>
    `<ellipse cx="0" cy="1" rx="5" ry="6" ${s}/>` +
    `<path d="M -5 -2 H 5 M -8 -3 L -5 -1 M 8 -3 L 5 -1 M -8 3 H -5 M 8 3 H 5 M -7 7 L -5 4 M 7 7 L 5 4 M -2 -6 L -4 -9 M 2 -6 L 4 -9" ${s}/>`,
  rocket: () =>
    `<path d="M 0 -10 C 4 -6 4 0 2 5 H -2 C -4 0 -4 -6 0 -10 Z" ${s}/>` +
    `<circle cx="0" cy="-3" r="1.6" ${s}/><path d="M -2 5 L -5 9 L -2 7 M 2 5 L 5 9 L 2 7" ${s}/>`,
  webhook: () =>
    `<circle cx="-4" cy="-4" r="2.6" ${s}/><circle cx="5" cy="5" r="2.6" ${s}/>` +
    `<path d="M -2.5 -2 C 1 1 1 3 2.8 4" ${s}/>`,
  function: () =>
    `<path d="M 5 -8 H 3 C 1 -8 0 -6 0 -3 V 8 M -4 -2 H 4" ${s}/>`,

  // ── Tier 3 · people / business / analytics ──────────────────
  users: () =>
    `<circle cx="-3" cy="-4" r="3.2" ${s}/><path d="M -10 9 C -10 3 4 3 4 9" ${s}/>` +
    `<circle cx="5" cy="-3" r="2.6" ${s}/><path d="M 6 0 C 9 0.5 10 4 10 9" ${s}/>`,
  building: () =>
    `<rect x="-7" y="-9" width="14" height="18" rx="1" ${s}/>` +
    `<path d="M -4 -5 H -1 M 1 -5 H 4 M -4 -1 H -1 M 1 -1 H 4 M -2 9 V 4 H 2 V 9" ${s}/>`,
  briefcase: () =>
    `<rect x="-9" y="-4" width="18" height="12" rx="1.5" ${s}/>` +
    `<path d="M -4 -4 V -7 H 4 V -4 M -9 1 H 9" ${s}/>`,
  money: () =>
    `<circle cx="0" cy="0" r="9" ${s}/>` +
    `<path d="M 0 -6 V 6 M 3 -3 C 3 -5 -3 -5 -3 -2.5 C -3 0 3 0 3 2.5 C 3 5 -3 5 -3 3" ${s}/>`,
  "bar-chart": () =>
    `<path d="M -9 9 H 9 M -8 9 V -9" ${s}/>` +
    `<rect x="-6" y="1" width="3.4" height="8" ${sf}/><rect x="-1" y="-4" width="3.4" height="13" ${sf}/><rect x="4" y="-8" width="3.4" height="17" ${sf}/>`,
  "pie-chart": () =>
    `<circle cx="0" cy="0" r="9" ${s}/><path d="M 0 0 L 0 -9 A 9 9 0 0 1 7.8 4.5 Z" ${s}/>`,
  trend: () => `<path d="M -9 7 L -3 1 L 1 4 L 9 -6 M 9 -6 H 4 M 9 -6 V -1" ${s}/>`,
  chat: () => `<path d="M -9 -7 H 9 V 3 H -2 L -6 7 V 3 H -9 Z" ${s}/>`,
  bell: () =>
    `<path d="M 0 -9 C 4 -9 6 -6 6 -2 C 6 3 8 5 8 5 H -8 C -8 5 -6 3 -6 -2 C -6 -6 -4 -9 0 -9 Z" ${s}/>` +
    `<path d="M -2.5 5 C -2.5 8 2.5 8 2.5 5" ${s}/>`,
  phone: () =>
    `<path d="M -7 -7 C -3 -3 3 3 7 7 C 9 5 9 3 7 2 L 4 4 C 1 2 -2 -1 -4 -4 L -2 -7 C -3 -9 -5 -9 -7 -7 Z" ${s}/>`,

  // ── Tier 4 · medical ─────────────────────────────────────────
  heart: () =>
    `<path d="M 0 8 C -8 1 -9 -7 -3 -7 C -1 -7 0 -5 0 -4 C 0 -5 1 -7 3 -7 C 9 -7 8 1 0 8 Z" ${s}/>`,
  pill: () =>
    `<g transform="rotate(-40)"><rect x="-9" y="-4" width="18" height="8" rx="4" ${s}/><path d="M 0 -4 V 4" ${s}/></g>`,
  cross: () =>
    `<path d="M -3 -9 H 3 V -3 H 9 V 3 H 3 V 9 H -3 V 3 H -9 V -3 H -3 Z" ${s}/>`,
  syringe: () =>
    `<g transform="rotate(-45)"><rect x="-6" y="-3" width="11" height="6" ${s}/><path d="M 5 0 H 10 M -6 -3 V 3 M -8 0 H -6 M 0 -3 V 3 M 2.5 -3 V 3" ${s}/></g>`,
  dna: () =>
    `<path d="M -5 -9 C 5 -4 -5 4 5 9 M 5 -9 C -5 -4 5 4 -5 9" ${s}/>` +
    `<path d="M -2.5 -6 H 2.5 M -3.5 0 H 3.5 M -2.5 6 H 2.5" ${s}/>`,

  // ── Tier 4 · legal ───────────────────────────────────────────
  scale: () =>
    `<path d="M 0 -9 V 9 M -8 9 H 8 M -8 -5 H 8" ${s}/><circle cx="0" cy="-7.5" r="1.3" ${sf}/>` +
    `<path d="M -8 -5 L -10.5 1 H -5.5 Z M 8 -5 L 5.5 1 H 10.5 Z" ${s}/>`,
  gavel: () =>
    `<g transform="rotate(40)"><rect x="-5" y="-4.5" width="10" height="9" rx="1" ${s}/><path d="M 0 4.5 V 11 M -5 -2 H 5" ${s}/></g>`,
  contract: () =>
    `<path d="M -7 -10 H 3 L 7 -6 V 10 H -7 Z" ${s}/>` +
    `<path d="M 3 -10 V -6 H 7 M -4 -2 H 3 M -4 1 H 1 M -4 5 C -2 3 0 7 2 5 C 3 4 4 5 4.5 5" ${s}/>`,
  stamp: () =>
    `<path d="M -7 9 H 7 M -7 6 H 7 M -4 6 V 2 C -4 0 -2 0 -2 -2 V -5 C -2 -7 2 -7 2 -5 V -2 C 2 0 4 0 4 2 V 6" ${s}/>`,

  // ── Tier 4 · engineering ─────────────────────────────────────
  bolt: () => `<path d="M 2 -9 L -5 2 H 0 L -2 9 L 6 -2 H 1 Z" ${s}/>`,
  battery: () =>
    `<rect x="-9" y="-5" width="16" height="10" rx="1.5" ${s}/><path d="M 7 -2 H 9 V 2 H 7" ${s}/>` +
    `<path d="M -5 -2 V 2 M -1 -2 V 2 M 3 -2 V 2" ${s}/>`,
  gauge: () =>
    `<path d="M -8 5 A 8 8 0 0 1 8 5" ${s}/><path d="M 0 5 L 4.5 -2" ${s}/><circle cx="0" cy="5" r="1.5" ${sf}/>` +
    `<path d="M -8 5 H -6 M 8 5 H 6 M 0 -3 V -1" ${s}/>`,
  wrench: () =>
    `<path d="M 5 -9 A 4 4 0 1 0 9 -3 L -1 7 L -4 9.5 L -6.5 7 L -4 4 Z" ${s}/>`,
  factory: () =>
    `<path d="M -9 9 V -1 L -3 3 V -1 L 3 3 V -1 L 9 3 V 9 Z" ${s}/>` +
    `<path d="M -7 -1 V -7 H -4 V -3" ${s}/>`,
  valve: () =>
    `<path d="M -9 -6 V 6 L 0 0 Z M 9 -6 V 6 L 0 0 Z" ${s}/><path d="M 0 0 V -8 M -3 -8 H 3" ${s}/>`,

  // ── Tier 4 · finance ─────────────────────────────────────────
  bank: () =>
    `<path d="M -9 -2 L 0 -8 L 9 -2 Z" ${s}/>` +
    `<path d="M -7 -2 V 7 M -2.5 -2 V 7 M 2.5 -2 V 7 M 7 -2 V 7 M -9 9 H 9" ${s}/>`,
  "credit-card": () =>
    `<rect x="-10" y="-7" width="20" height="14" rx="2" ${s}/><path d="M -10 -2 H 10 M -7 4 H -2" ${s}/>`,
  invoice: () =>
    `<path d="M -7 -10 H 7 V 9 L 5 11 L 3 9 L 1 11 L -1 9 L -3 11 L -5 9 L -7 11 Z" ${s}/>` +
    `<path d="M -4 -5 H 4 M -4 -1 H 4 M -4 3 H 1" ${s}/>`,
  coins: () =>
    `<ellipse cx="0" cy="-4" rx="7" ry="3" ${s}/>` +
    `<path d="M -7 -4 V 2 C -7 4 7 4 7 2 V -4 M -7 -1 C -7 1 7 1 7 -1" ${s}/>`,
};

// Aliases → canonical icon names (AI-friendly synonyms).
const ALIASES: Record<string, string> = {
  db: "database",
  storage: "database",
  api: "server",
  service: "server",
  person: "user",
  account: "user",
  customer: "user",
  cog: "gear",
  settings: "gear",
  config: "gear",
  doc: "document",
  web: "globe",
  internet: "globe",
  www: "globe",
  secure: "lock",
  auth: "lock",
  password: "lock",
  email: "mail",
  envelope: "mail",
  time: "clock",
  timer: "clock",
  schedule: "clock",
  done: "check",
  success: "check",
  ok: "check",
  complete: "check",
  warning: "alert",
  error: "alert",
  danger: "alert",
  // tier 1
  directory: "folder",
  page: "file",
  find: "search",
  pencil: "edit",
  modify: "edit",
  delete: "trash",
  remove: "trash",
  plus: "add",
  new: "add",
  create: "add",
  refresh: "sync",
  reload: "sync",
  publish: "upload",
  import: "download",
  save: "download",
  url: "link",
  date: "calendar",
  events: "calendar",
  menu: "list",
  steps: "list",
  sort: "filter",
  milestone: "flag",
  favorite: "star",
  rating: "star",
  label: "tag",
  about: "info",
  help: "question",
  faq: "question",
  close: "cancel",
  reject: "cancel",
  start: "play",
  run: "play",
  end: "stop",
  // tier 2
  dev: "code",
  source: "code",
  shell: "terminal",
  cli: "terminal",
  docker: "container",
  pod: "container",
  redis: "cache",
  firewall: "shield",
  protect: "shield",
  token: "key",
  credential: "key",
  site: "browser",
  phone_app: "mobile",
  app: "mobile",
  monitor: "desktop",
  computer: "desktop",
  chip: "cpu",
  processor: "cpu",
  git: "git-branch",
  branch: "git-branch",
  issue: "bug",
  defect: "bug",
  deploy: "rocket",
  launch: "rocket",
  ship: "rocket",
  hook: "webhook",
  fn: "function",
  lambda: "function",
  // tier 3
  group: "users",
  team: "users",
  org: "building",
  company: "building",
  office: "building",
  work: "briefcase",
  job: "briefcase",
  cash: "money",
  dollar: "money",
  payment: "money",
  chart: "bar-chart",
  bars: "bar-chart",
  metrics: "bar-chart",
  pie: "pie-chart",
  growth: "trend",
  analytics: "trend",
  message: "chat",
  comment: "chat",
  notification: "bell",
  notify: "bell",
  call: "phone",
  // tier 4 medical
  health: "heart",
  like: "heart",
  medication: "pill",
  drug: "pill",
  clinic: "cross",
  hospital: "cross",
  medical: "cross",
  injection: "syringe",
  vaccine: "syringe",
  gene: "dna",
  genetic: "dna",
  // tier 4 legal
  justice: "scale",
  balance: "scale",
  legal: "scale",
  judge: "gavel",
  court: "gavel",
  agreement: "contract",
  signed: "contract",
  seal: "stamp",
  approved: "stamp",
  // tier 4 engineering
  power: "bolt",
  electric: "bolt",
  flash: "bolt",
  charge: "battery",
  meter: "gauge",
  speed: "gauge",
  tool: "wrench",
  tools: "wrench",
  repair: "wrench",
  plant: "factory",
  industrial: "factory",
  // tier 4 finance
  finance: "bank",
  card: "credit-card",
  bill: "invoice",
  receipt: "invoice",
  coin: "coins",
};

/** Resolve a (possibly aliased) icon name to its canonical key, or undefined. */
export function resolveIconName(name: string): string | undefined {
  const key = name.toLowerCase();
  if (ICONS[key]) return key;
  if (ALIASES[key] && ICONS[ALIASES[key]]) return ALIASES[key];
  return undefined;
}

/** All canonical icon names (for tests / docs). */
export function iconNames(): string[] {
  return Object.keys(ICONS);
}

/**
 * Render an icon's inner markup centred at the origin. Unknown names fall back
 * to a generic tag glyph so the reserved space is never blank and the node
 * still renders — the engine degrades gracefully rather than erroring.
 */
export function renderIcon(name: string): string {
  const key = resolveIconName(name);
  if (key) return ICONS[key]!();
  return (
    `<path d="M -9 -5 H 2 L 9 0 L 2 5 H -9 Z" ${s}/>` +
    `<circle cx="-5" cy="0" r="1" ${sf}/>`
  );
}

export function hasIcon(name: string | undefined): boolean {
  return typeof name === "string" && name.length > 0;
}
