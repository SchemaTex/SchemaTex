// Dev-only: render a gallery of network-topology examples to a static HTML page
// for visual review. Not part of the build. Output: /tmp/schematex-network-preview.
import { render } from "../dist/index.js";
import { writeFileSync, mkdirSync } from "node:fs";

const examples = [
  {
    title: "CCTV camera network (the originating use case)",
    note: "tiered · IP subnet boundary · PoE links · dome/ptz/bullet camera silhouettes · NVR",
    dsl: `network "Acme HQ — CCTV"
  layout: tiered
  internet net "Internet"
  firewall fw1 "Perimeter FW" tier: edge
  l3switch core1 "Core SW" tier: core
  poeswitch poe1 "PoE Switch A" tier: access
  poeswitch poe2 "PoE Switch B" tier: access
  nvr nvr1 "Video Recorder"
  monitor wall1 "Guard Station"
  subnet cams "192.168.20.0/24" {
    camera cam1 "Lobby Dome" type: dome ip: 192.168.20.11
    camera cam2 "Gate PTZ" type: ptz ip: 192.168.20.12
    camera cam3 "Dock Bullet" type: bullet ip: 192.168.20.13
    poe1
    poe2
  }
  net -- fw1 : wan "ISP 1Gbps"
  fw1 -- core1 : fiber 10G
  core1 -- poe1 : trunk vlan: 20 1G
  core1 -- poe2 : trunk vlan: 20 1G
  core1 -- nvr1 : 1G
  core1 -- wall1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe
  poe2 -- cam3 : poe`,
  },
  {
    title: "Enterprise campus — three-tier hierarchical model",
    note: "edge → core → distribution → access bands · LAG core uplink · server farm",
    dsl: `network "Driscoll Campus"
  layout: tiered
  internet inet
  cloud wan "WAN"
  firewall fw1 "Core Firewall" tier: edge
  router er1 "Edge Rtr 1" tier: edge
  l3switch cs1 "Core SW 1" tier: core
  l3switch cs2 "Core SW 2" tier: core
  switch d1 "Dist A" tier: distribution
  switch d2 "Dist B" tier: distribution
  serverfarm farm "Server Farm" count: 4
  a1 a2 a3 : switch tier: access
  inet -- fw1
  wan -- er1 : serial
  fw1 -- cs1 : 10G
  er1 -- cs2
  cs1 == cs2 : lag 40G
  cs1 -- d1
  cs2 -- d2
  cs1 -- farm : trunk vlan: 100
  d1 -- a1
  d2 -- a2
  d2 -- a3`,
  },
  {
    title: "Home / SOHO (star)",
    note: "star layout · wireless (dashed) link to laptop",
    dsl: `network "Home"
  layout: star
  router gw "Gateway"
  pc pc1
  laptop lt1
  printer pr1
  mobile ph1
  gw -- pc1
  gw -- lt1 : wireless
  gw -- pr1
  gw -- ph1 : wireless`,
  },
  {
    title: "Spine-leaf data-center fabric",
    note: "auto-meshed spine↔leaf links · hosts hang under their leaf",
    dsl: `network "DC Fabric"
  layout: spine-leaf
  spines: sp1 sp2
  leaves: lf1 lf2 lf3 lf4
  server h1
  server h2
  server h3
  lf1 -- h1 : 25G
  lf2 -- h2 : 25G
  lf4 -- h3 : 25G`,
  },
  {
    title: "Link-type showcase",
    note: "copper · fiber (orange + ticks) · wireless · serial · PoE · VPN tunnel · LAG · port/VLAN/speed tags",
    dsl: `network "Link types"
  layout: tree
  router core "Core"
  switch a "Sw A"
  switch b "Sw B"
  ap ap1 "AP"
  server s1
  camera c1 type: turret
  vpngw vpn1 "VPN GW"
  core -- a : fiber 10G port: Gi0/1>Gi1/0/1
  core -- b : lag 20G
  a -- ap1 : wireless
  a -- s1 : trunk vlan: 10,20 1G
  b -- c1 : poe
  core -- vpn1 : vpn "site-to-site"`,
  },
  {
    title: "Boundaries — site · rack · subnet · DMZ",
    note: "physical containers (solid) vs logical overlays (dashed tinted) · security zone",
    dsl: `network "Branch Office"
  layout: tiered
  internet net
  site hq "HQ Building" {
    rack mdf "MDF Rack" {
      firewall fw1 tier: edge
      l3switch core1 tier: core
    }
  }
  zone dmz "DMZ" {
    server web "Web Server"
  }
  subnet lan "10.0.10.0/24" {
    switch a1 tier: access
    pc u1 "User PC" ip: 10.0.10.50
  }
  net -- fw1 : wan
  fw1 -- web
  fw1 -- core1 : 10G
  core1 -- a1 : trunk vlan: 10
  a1 -- u1`,
  },
  {
    title: "Ring topology",
    note: "ring layout — nodes on a circle",
    dsl: `network "Metro Ring"
  layout: ring
  router r1
  router r2
  router r3
  router r4
  r1 -- r2 : fiber
  r2 -- r3 : fiber
  r3 -- r4 : fiber
  r4 -- r1 : fiber`,
  },
  {
    title: "CCTV — dark theme",
    note: "same DSL as example 1 family, theme: dark",
    theme: "dark",
    dsl: `network "CCTV (dark)"
  layout: tiered
  l3switch core1 tier: core
  poeswitch poe1 tier: access
  nvr nvr1
  subnet cams "192.168.20.0/24" {
    camera cam1 type: dome ip: 192.168.20.11
    camera cam2 type: ptz ip: 192.168.20.12
    poe1
  }
  core1 -- poe1 : trunk vlan: 20 1G
  core1 -- nvr1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe`,
  },
  {
    title: "Campus — monochrome (print/audit)",
    note: "theme: monochrome — link semantics fall back to line-style + text tags",
    theme: "monochrome",
    dsl: `network "Campus (mono)"
  layout: tiered
  firewall fw1 tier: edge
  l3switch cs1 tier: core
  switch d1 tier: distribution
  switch a1 tier: access
  fw1 -- cs1 : fiber 10G
  cs1 -- d1 : lag
  d1 -- a1 : trunk vlan: 10`,
  },
];

// ── Icon catalog: render one of every device kind for visual review ──
const iconKinds = [
  ["router", "Router"], ["switch", "Switch (L2)"], ["l3switch", "L3 Switch"], ["firewall", "Firewall"],
  ["loadbalancer", "Load Balancer"], ["ap", "Access Point"], ["wlc", "WLAN Ctrl"], ["gateway", "Gateway"],
  ["modem", "Modem"], ["ids", "IDS/IPS"], ["proxy", "Proxy"], ["vpngw", "VPN GW"],
  ["server", "Server"], ["serverfarm", "Server Farm"], ["pc", "PC"], ["laptop", "Laptop"],
  ["mobile", "Mobile"], ["ipphone", "IP Phone"], ["printer", "Printer"], ["storage", "Storage"],
  ["camera|fixed", "Cam (fixed)"], ["camera|bullet", "Cam (bullet)"], ["camera|dome", "Cam (dome)"],
  ["camera|ptz", "Cam (PTZ)"], ["camera|turret", "Cam (turret)"],
  ["nvr", "NVR"], ["dvr", "DVR"], ["poeswitch", "PoE Switch"], ["encoder", "Encoder"], ["monitor", "Monitor"],
  ["internet", "Internet"], ["wan", "WAN"], ["pstn", "PSTN"], ["cloud", "Cloud"],
];
const iconCells = iconKinds
  .map(([spec, name]) => {
    const [kind, camType] = spec.split("|");
    const decl = camType ? `camera dev "${name}" type: ${camType}` : `${kind} dev "${name}"`;
    let svg;
    try {
      svg = render(`network\n  layout: manual\n  ${decl}`);
    } catch (e) {
      svg = `<span class="err">${String(e && e.message ? e.message : e)}</span>`;
    }
    return `<div class="icon-cell"><div class="icon-svg">${svg}</div></div>`;
  })
  .join("\n");
const catalogCard = `<section class="card">
  <header><h2>Icon catalog (${iconKinds.length} device kinds)</h2><p>original Cisco-convention line-art · default theme</p></header>
  <div class="icon-grid">${iconCells}</div>
</section>`;

const cards = examples
  .map((ex) => {
    let svg;
    try {
      svg = render(ex.dsl, ex.theme ? { theme: ex.theme } : undefined);
    } catch (e) {
      svg = `<pre class="err">${String(e && e.message ? e.message : e)}</pre>`;
    }
    const escDsl = ex.dsl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bg = ex.theme === "dark" ? ' style="background:#1e1e2e"' : "";
    return `<section class="card">
  <header><h2>${ex.title}</h2><p>${ex.note}</p></header>
  <div class="body">
    <pre class="dsl">${escDsl}</pre>
    <div class="svg"${bg}>${svg}</div>
  </div>
</section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Schematex — Network topology preview</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #1f2937; background: #f5f7fa; }
  .top { padding: 28px 32px 8px; }
  .top h1 { margin: 0 0 4px; font-size: 22px; }
  .top p { margin: 0; color: #6b7280; }
  .grid { padding: 16px 24px 64px; display: grid; gap: 20px; grid-template-columns: 1fr; max-width: 1320px; margin: 0 auto; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  .card header { padding: 14px 18px; border-bottom: 1px solid #f0f1f3; }
  .card header h2 { margin: 0; font-size: 16px; }
  .card header p { margin: 4px 0 0; color: #6b7280; font-size: 12.5px; }
  .body { display: grid; grid-template-columns: 380px 1fr; gap: 0; align-items: stretch; }
  @media (max-width: 920px){ .body { grid-template-columns: 1fr; } }
  .dsl { margin: 0; padding: 16px 18px; background: #0f172a; color: #e2e8f0; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow: auto; white-space: pre; border-right: 1px solid #f0f1f3; }
  .svg { padding: 18px; display: flex; align-items: center; justify-content: center; overflow: auto; }
  .svg svg { max-width: 100%; height: auto; }
  .err { color: #b91c1c; }
  .icon-grid { padding: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .icon-cell { border: 1px solid #eef0f3; border-radius: 8px; background: #fff; }
  .icon-svg { display: flex; align-items: center; justify-content: center; min-height: 96px; padding: 6px; }
  .icon-svg svg { max-width: 100%; height: auto; }
  footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 0 0 40px; }
</style>
</head>
<body>
  <div class="top">
    <h1>Schematex — Network topology preview</h1>
    <p>35-NETWORK-STANDARD · ${examples.length} examples · Cisco-convention icons · 8 layout modes · zero runtime deps.</p>
  </div>
  <div class="grid">
${catalogCard}
${cards}
  </div>
  <footer>Generated by scripts/preview-network.mjs — not committed.</footer>
</body>
</html>`;

const outDir = "/tmp/schematex-network-preview";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/index.html`, html);
console.log("wrote", `${outDir}/index.html`);
