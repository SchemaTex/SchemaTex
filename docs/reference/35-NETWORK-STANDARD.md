# 35 — Network Topology Standard Reference

*Physical and logical network diagrams — typed **device** nodes (routers, switches, firewalls, access points, servers, IP cameras, NVRs …) connected by typed, annotated **links** (Ethernet / fiber / wireless / serial-WAN / PoE / VPN), grouped into **boundaries** (sites, racks, subnets, VLANs, security zones), and laid out by a **topology-aware engine** that understands the structures network designers actually draw — point-to-point, star, bus, ring, mesh, tree, the Cisco three-tier hierarchical model, and spine-leaf (Clos). Schematex implements the de-facto visual vocabulary (Cisco network-topology icon silhouettes) as original semantic SVG, with a text DSL designed for AI generation, and — unlike a generic graph tool — it **never drops a device, a port, or a link**, and it **lays each topology class out the way the standard says it looks**, not as an undifferentiated force-directed blob.*

> **Primary references (the standard landscape).** Network topology diagramming has **no single formal standard** the way circuits have IEEE 315 or P&ID has ISA-5.1. The notation is convention-driven, and the conventions are dominated by one source. Schematex therefore treats the following as its baseline and documents every deviation explicitly in §10:
> - **Cisco Network Topology Icons** — Cisco Brand Center (`cisco.com/c/en/us/about/brand-center/network-topology-icons.html`) and the **Cisco SAFE Icon Library**. *The de-facto visual standard.* Cisco's icon set ("globally recognized and generally accepted as standard for network icon topologies") is the silhouette vocabulary every other tool — Visio, Lucidchart, draw.io, yEd, ConceptDraw — reproduces: router = puck/cylinder with curved in/out arrows, L2 switch = box with straight forward/back arrows, multilayer switch = box with circular arrows, firewall = brick wall, cloud = WAN/Internet, etc. Cisco licenses the icons for free use **but forbids altering them**, so Schematex ships its *own original line-art* that follows the conventional silhouettes rather than copying Cisco's artwork (§10).
> - **Cisco Enterprise Campus Architecture / Hierarchical Internetworking Model** — the **three-tier** model (Core → Distribution → Access) and its **two-tier "collapsed core"** reduction. The canonical layered topology. (Cisco Press, *Designing Cisco Network Service Architectures (ARCH)*; Oppenheimer, *Top-Down Network Design*, Cisco Press.)
> - **Spine-leaf (folded-Clos) topology** — Charles Clos (1953), *"A Study of Non-Blocking Switching Networks", Bell System Technical Journal* **32**(2): 406–424; the modern data-center fabric standard.
> - **Network topology taxonomy** — point-to-point, bus, star, ring, mesh (full/partial), tree, hybrid. Tanenbaum & Wetherall, *Computer Networks* (5th ed., Pearson); taught in every networking course. (See the GeeksforGeeks "Types of Network Topology" reference Victor supplied.)
> - **ANSI/TIA-606-D:2021** — *Administration Standard for Telecommunications Infrastructure.* The cable/port **labeling and color-coding** convention Schematex follows for link annotations: orange = fiber demarcation, green = network connection, white = backbone, blue = horizontal/station, purple = common equipment. Cabling categories/speeds reference **ANSI/TIA-568** (Cat 5e/6/6A → 1G/10G).
> - **ONVIF** profiles (Profile S streaming, Profile G recording, Profile T) — the IP-video interoperability standard that defines the *device roles* (IP camera, NVR, encoder) Schematex renders for the CCTV cluster. ONVIF is an interoperability standard, not a drawing standard, but it fixes the vocabulary of the surveillance topology.
>
> *Honest framing (mirrors the Petri-net §0 note).* Because the graphical notation is **light-touch in the formal standards**, Schematex treats **Cisco's icon silhouettes as the visual baseline**, the **hierarchical/spine-leaf models** as the layout baseline, **TIA-606-D** as the annotation/colour baseline, and **ONVIF** as the CCTV role vocabulary. This is the same stance the Petri-net engine takes toward Murata's figures.

---

## 0. Positioning

**Schematex renders physical and logical network topology diagrams with its `network` engine.** Every network designer, IT infrastructure engineer, sysadmin, MSP, and physical-security (CCTV) integrator draws them — for design proposals, as-built documentation, audit evidence, troubleshooting, and customer hand-off. They are convention-rich (a router does not look like a switch; a fiber link does not look like a copper link; a camera subnet is a recognisable shape) and that is exactly why a *generic* shape tool produces wrong-looking, low-trust output.

**Why this engine exists — the demand signal.** The motivating requests included: *"una topología de red para cámaras"* (a network topology for cameras), *"a customizable, editable, and printable network diagram that I can update for different networks"*, enterprise infrastructure diagrams. These requests need typed device icons and annotated links with topology-aware placement, which the `network` engine provides. At least one such user arrived after hitting a **Microsoft Copilot paywall** whose headline capability is IT-infrastructure network diagrams — i.e. this audience is *already paying* for exactly this.

**The competitor landscape splits three ways.** (1) **Auto-discovery / monitoring tools** — Auvik, SolarWinds Network Topology Mapper, ManageEngine — discover the live network over SNMP/LLDP/CDP and draw it; powerful but heavyweight, subscription-priced, and not authorable by hand or by an LLM. (2) **General diagramming with stencils** — Visio (Cisco stencils), Lucidchart, draw.io / diagrams.net (Cisco shape libraries), yEd, ConceptDraw — give you the Cisco *shapes* but no topology semantics: you hand-place every icon, links are dumb lines, and there is no notion of a tier, a subnet, or a port that the tool will keep consistent. (3) **Code-to-diagram** — `mingrammer/diagrams` (Python, cloud-provider icons), and Mermaid/PlantUML which have **no network diagram type at all**. **There is no free, embeddable, zero-dependency, text-first network topology engine that renders the standard device icons *and* lays out each topology class correctly *and* guarantees device/port/link integrity.** Schematex `network` closes that gap.

**The differentiator is topology-correct layout + device/port/link integrity, not the icon.** Anyone can draw a box. What distinguishes a real network-diagram engine is that it (a) knows that a *star* has a hub at the centre, a *ring* closes a loop, a *spine-leaf* is two fully-meshed rows, and the *three-tier* model is core-over-distribution-over-access bands — and renders each accordingly instead of as a generic blob; (b) **never silently drops a device or a port** the way an LLM emitting raw Mermaid does (the P0 we are fixing); (c) renders each **link type** with its conventional appearance (fiber distinct from copper distinct from wireless) and carries its **annotations** (port, speed, VLAN, IP/CIDR, trunk/access) as first-class data, not free text; and (d) optionally **validates** structural facts — a device's IP must fall inside its declared subnet's CIDR, a VLAN id must be 1–4094, a trunk must connect switch-class devices. The render is downstream of a validated model, exactly the stance `pert` (schedule) and `petri` (marking) take.

---

## 1. Relation to Existing Schematex Engines

| Engine | Coverage | Why network topology is different |
|---|---|---|
| `flowchart` (§14) | Generic process / decision DAG (Sugiyama) | A flowchart has one node kind and dumb arrows. A network diagram has a **typed device catalog** (each kind → a distinct icon), **typed annotated links** (fiber ≠ copper ≠ wireless, carrying port/VLAN/IP), and **topology-class layouts** (star/ring/bus/mesh/spine-leaf) that a layered DAG cannot produce. Routing a flowchart through "network" loses all of this — which is the P0 we are fixing. |
| `c4` (§30) | Software architecture (System/Container/Component) | C4's "containers" are *software* (a Next.js app, a Postgres database) inside trust boundaries; network's nodes are *physical/virtual network devices* with ports, IPs, and VLANs inside sites/racks/subnets. C4 has no device icons, no link types, no topology classes. Adjacent domain, disjoint vocabulary. |
| `sld` (§11) | Power single-line diagram (IEEE 315) | **Structurally the closest cousin.** SLD bands devices by *voltage level* top-to-bottom; network `tiered` layout bands devices by *network tier* (core/distribution/access) the same way, and both reuse hierarchical placement. But the symbol set (breakers/transformers vs routers/switches), the link semantics (bus bars vs Ethernet/fiber), and the domain are entirely different. Network borrows SLD's *banding idea*, not its symbols. |
| `block` (§09) | Control-systems block diagram | Block diagrams are signal-flow boxes with L→R feedback routing; no device taxonomy, no grouping containers, no topology classes. |
| `sociogram` (§05) | Social network (Moreno) | Shares the *circular* and *mesh* geometric layouts (network reuses sociogram's circle/ring placement and Fruchterman-Reingold mesh kernel), but sociogram nodes are people with valence-coded ties — no device icons, ports, or tiers. |

**Layout reuse.** Network inherits two existing layout kernels rather than inventing new ones: the **`flowchart` Sugiyama stack** (cycle removal → longest-path layering → barycenter ordering → Brandes-Köpf x-coords → orthogonal routing) powers `tree` and `tiered`; the **`sociogram` geometric placers** (even-angle circle, force-directed) power `star`, `ring`, and `mesh`. `bus` and `spine-leaf` are small dedicated placers (a backbone spine with drop-lines; two fully-connected rows). The novel work is the **device symbol catalog**, the **typed-link renderer with annotations**, and the **boundary cluster geometry** (reused conceptually from C4's dashed-boundary code) — all additions on top of existing kernels, not a new engine core.

---

## 2. The Vocabulary (what "the standard" actually contains)

Per the project rule (cover the full published vocabulary in v0.1, not a partial subset), the tables below specify the **complete** device/link/boundary/annotation vocabulary. The **v0.1 column** marks what the first release renders; everything else is specified here so the DSL and types never have to change to add it later. v0.1 deliberately covers **(a) the common enterprise L2/L3 infrastructure, (b) the full CCTV / physical-security cluster** (the paying use case Victor identified), **(c) endpoints, (d) clouds, (e) the boundary set, and (f) every common link type + annotation** — because a partial device set is exactly what makes the diagram "wrong" for a professional.

### 2.1 Device catalog — Network infrastructure (L2 / L3)

| Kind (`id`) | Meaning | Icon silhouette (Cisco-convention, redrawn) | v0.1 |
|------|---------|------------------------------|:----:|
| `router` | L3 packet forwarding between networks | puck / short cylinder with two curved-in + two curved-out arrows | ✅ |
| `switch` | L2 frame switching (default switch) | rack face with port sockets | ✅ |
| `l3switch` / `multilayer` | multilayer (routing) switch | rack face with port sockets and routing arrows | ✅ |
| `firewall` | stateful perimeter / segmentation firewall | **brick wall** rectangle (offset courses) | ✅ |
| `loadbalancer` | traffic distribution | box with fan-out arrows | ✅ |
| `ap` / `wifi` | wireless access point | puck with **radio-wave arcs** | ✅ |
| `wlc` | wireless LAN controller | box with AP glyph + arcs | ✅ |
| `gateway` | edge / default gateway | router glyph tagged `GW` | ✅ |
| `modem` | DSL / cable / fiber modem | small box with signal lines | ✅ |
| `ids` / `ips` | intrusion detection / prevention | box with shield/eye glyph | ✅ |
| `proxy` | forward / reverse proxy | box with bidirectional arrow | ✅ |
| `vpngw` | VPN concentrator / gateway | router glyph with lock | ✅ |
| `hub` | accepted alias for `switch` | same rack-face switch icon | ✅ |
| `bridge` | accepted alias for `switch` | same rack-face switch icon | ✅ |

### 2.2 Device catalog — Endpoints / hosts

| Kind | Meaning | Icon | v0.1 |
|------|---------|------|:----:|
| `server` | physical / virtual server | tower or rack-unit box with face slots | ✅ |
| `serverfarm` / `servers` | a stack/cluster of servers | three offset server boxes (use `count:` for n) | ✅ |
| `pc` / `workstation` | desktop workstation | monitor + base | ✅ |
| `laptop` | laptop | clamshell silhouette | ✅ |
| `mobile` / `phone` | smartphone | rounded handset rectangle | ✅ |
| `ipphone` / `voip` | VoIP desk phone | phone handset on base | ✅ |
| `printer` | network printer / MFP | printer body with paper tray | ✅ |
| `storage` | generic storage array | drive-bay enclosure | ✅ |

### 2.3 Device catalog — CCTV / physical security (ONVIF roles) — **full v0.1**

> This cluster ships **complete in v0.1** because the originating demand (*"topología de red para cámaras"*, the Copilot-paywall refugees) is precisely this, and a half-built camera catalog is useless to an integrator.

| Kind | Meaning | Icon | v0.1 |
|------|---------|------|:----:|
| `camera` | IP camera; `type:` selects body style | lens body; `type: fixed\|bullet\|dome\|ptz\|turret` switches the silhouette | ✅ |
| `nvr` | network video recorder | box with disk-platter glyph + "NVR" | ✅ |
| `dvr` | digital video recorder (analog/HD-over-coax) | box with disk glyph + "DVR" | ✅ |
| `poeswitch` | PoE / PoE+ switch (powers cameras) | switch box tagged `PoE` | ✅ |
| `encoder` / `decoder` | analog↔IP video encoder/decoder | box with ▷ glyph | ✅ |
| `monitor` / `videowall` | spot monitor / video wall | display rectangle (grid for video wall) | ✅ |
| `intercom` | door station / intercom | bell/speaker glyph | ⬜ deferred |

### 2.4 Device catalog — Networks / clouds (multi-device abstractions)

| Kind | Meaning | Icon | v0.1 |
|------|---------|------|:----:|
| `internet` | the public Internet | cloud labelled "Internet" | ✅ |
| `wan` | wide-area network | cloud labelled "WAN" | ✅ |
| `cloud` | generic cloud / provider | cloud, custom label | ✅ |
| `pstn` | public switched telephone network | cloud labelled "PSTN" with phone glyph | ✅ |
| `lan` / `segment` | a shared L2 segment (bus backbone) | a horizontal **bus bar** that links attach to | ✅ |

### 2.4.1 Additional physical and virtual devices

Each kind below is accepted by the parser and has its own original line-art icon. `nas` and `san` are independent kinds; neither aliases `storage`. `db` and `dbserver` alias `database`. Use the exact hyphenated names `iot-sensor` and `access-control`.

| Kind | Meaning | Icon silhouette |
|---|---|---|
| `database` | Database service | Cylinder with stacked elliptical rims |
| `hypervisor` | Virtualization host | Server enclosure with overlapping VM panels |
| `nas` | Network-attached storage | Desktop enclosure with vertical drive bays |
| `wireless-bridge` | Point-to-point wireless bridge | Pole-mounted panel with radio arcs |
| `container` | Software container | Ribbed perspective container box |
| `cellular-router` | Cellular network router | Antenna, routing arrows, signal bars |
| `satellite-terminal` | Satellite terminal | Dish, feed arm, and stand |
| `access-control` | Door access controller | Controller panel linked to card reader |
| `iot-sensor` | IoT sensor | Vented sensor enclosure with radio arc |
| `display` | Wall display / TV | Wide screen with bezel |
| `san` | Storage area network | Connected rack arrays with drive bays |
| `olt` | Optical line terminal | Rack chassis with optical ports and fan-out glyph |
| `ont` | Optical network terminal | Small enclosure with optical and Ethernet ports |
| `pbx` | Private telephone exchange | Rack box with handset glyph and ports |
| `tablet` | Tablet computer | Portrait screen with camera and home mark |
| `plc` | Programmable logic controller | DIN-rail controller and I/O modules |
| `ups` | Uninterruptible power supply | Tower with battery and lightning glyph |
| `hmi` | Industrial human-machine interface | Touch panel with controls and process trace |
| `media-converter` | Fiber media converter | Ethernet and optical ports with conversion arrows |
| `pos-terminal` | Point-of-sale terminal | Screen, keypad, and card |
| `patch-panel` | Passive patch panel | Rack strip with port sockets |

### 2.5 Boundaries / grouping containers

A device may live inside zero or more nested boundaries. **Physical** boundaries (site/rack) draw a solid-ish container; **logical** overlays (subnet/VLAN/zone) draw a tinted dashed region — same code path as C4's dashed boundary (§30) inflated by padding around the union of children.

| Boundary | Meaning | Notation | v0.1 |
|------|---------|----------|:----:|
| `site` / `building` / `campus` | a physical location | solid rounded rectangle, label top-left, optional 🏢 glyph | ✅ |
| `rack` | an equipment rack / closet (MDF/IDF) | rounded rectangle, label top-left | ✅ |
| `subnet` | an IP subnet (label = CIDR, e.g. `10.0.20.0/24`) | dashed tinted region | ✅ |
| `vlan` | a VLAN (label = id + name) | dashed tinted region, VLAN-coloured | ✅ |
| `zone` / `dmz` | a security zone (DMZ, trust zone) | dashed region, zone-coloured | ✅ |
| `region` / `az` | cloud region / availability zone | dashed region inside a `cloud` | ⬜ deferred |

### 2.6 Link types

| Link type | Meaning | Notation | v0.1 |
|------|---------|----------|:----:|
| `copper` / `ethernet` (default) | twisted-pair Ethernet | solid line | ✅ |
| `fiber` | optical fiber | solid line, **fiber colour** (TIA orange) + small ▮▮ slash marks, or thicker | ✅ |
| `wireless` | Wi-Fi / point-to-point radio | **dashed** line (or arc waves between APs) | ✅ |
| `serial` / `wan` | serial / leased WAN circuit | solid line with a small lightning/zigzag tick | ✅ |
| `poe` | Power-over-Ethernet (camera/AP power+data) | solid line tagged `⚡PoE` | ✅ |
| `vpn` | VPN tunnel (logical, over another path) | **dashed** line with a lock glyph, routed as an arc | ✅ |
| `lag` / `portchannel` | aggregated link (EtherChannel/LACP) | **double / thick** line, label `Po1` | ✅ |
| `stack` | switch stacking cable | short thick connector between stack members | ⬜ deferred |

### 2.7 Link annotations (order-free, all optional)

| Annotation | DSL token | Renders as | v0.1 |
|------|-----------|-----------|:----:|
| Port(s) | `port: Gi0/1` or `port: Gi0/1>eth0` | small labels at each endpoint (near-end / far-end) | ✅ |
| Speed | bareword `1G` `10G` `40G` `100M` `100G` | mid-link label | ✅ |
| Mode | `trunk` \| `access` | mid-link tag; `trunk` implies switch-class endpoints (validated) | ✅ |
| VLAN(s) | `vlan: 10` or `vlan: 10,20,30` | mid-link tag `VLAN 10`; colours the link if a single VLAN | ✅ |
| IP / CIDR | `ip: 10.0.0.1` or `ip: 10.0.0.0/30` | endpoint or mid-link label | ✅ |
| Protocol | `proto: ospf` \| `bgp` \| `eigrp` | small mid-link tag | ⬜ deferred |
| Free label | trailing `"…"` | mid-link caption | ✅ |

### 2.8 Computed / validated facts (the structural differentiator)

| Fact | Meaning | Surfaced as | v0.1 |
|------|---------|-------------|:----:|
| **Device/port integrity** | every declared device & port appears exactly once; no silent drops | guaranteed by construction; duplicate id = readable error | ✅ |
| **Tier inference** | a device's tier from `tier:` or from its position in the `tiered` layout | `data-tier` attribute; banding | ✅ |
| **Topology-class detection** | recognise star / ring / bus / mesh / tree / spine-leaf / hierarchical from the graph | reported in `<desc>` | ✅ |
| **Subnet membership check** | a device with `ip:` inside a `subnet` must fall within the CIDR | readable error on conflict | ✅ |
| **VLAN range check** | VLAN ids ∈ 1–4094 | readable error | ✅ |
| **Trunk endpoint check** | a `trunk` link connects switch-class devices | warning in `<desc>` | ✅ |
| **Redundancy / SPOF hint** | a node whose removal partitions the graph (articulation point) | annotated in `<desc>` | ⬜ deferred |
| **Live discovery import** | build the model from SNMP/LLDP/CDP/Nmap | — | ⬜ deferred (§11) |

---

## 3. Symbol Table

Original line-art following the Cisco-convention silhouettes (not Cisco's artwork — see §10). All strokes/fills come from the theme; no inline styles (hard constraint #3). CSS class prefix: `sx-net-*`.

```
 Router                L2 Switch            Multilayer (L3) switch     Firewall
   ╭───────╮            ┌─────────┐            ┌─────────┐            ┌─┬──┬──┬─┐
   │ ↘   ↗ │            │ →     → │            │  ↻   ↺  │            ├─┴┬─┴┬─┴─┤   brick
   │ ↗   ↘ │            │ ←     ← │            │  ↺   ↻  │            ├┬─┴┬─┴┬──┤   wall
   ╰───────╯            └─────────┘            └─────────┘            └─┴──┴──┴─┘
    R1 "Edge"            SW1 "Core"            L3-1 "Dist"            FW1

 Access Point          Server               Server farm            Workstation
    ╭───╮               ┌──────┐             ┌──────┐               ┌─────────┐
  ((│ • │))  radio      │ ▭▭▭▭ │             │┌──────┐              │ ▢▢▢▢▢▢  │
    ╰───╯    waves      │ ▭▭▭▭ │             ││┌──────┐             └────┬────┘
    AP1                 │ ▭▭▭▭ │             └┘│ ▭▭▭▭ │                 ▟▙
                        └──────┘               └──────┘             PC1

 IP Camera (type:)                            NVR / DVR              Cloud (internet/wan)
   fixed   bullet   dome      ptz             ┌────────┐              .-~-.~-~-.
    ▣──    ▭══○     ◖◗         ◍═╗             │ ◉  ◉   │            (  Internet  )
                              ║              │  NVR   │             `-._.-~-._.-'
   CAM1    CAM2    CAM3      CAM4-PTZ         └────────┘

 LAN segment (bus)        Subnet / VLAN boundary          Site / Rack boundary
 ═══════╤═══╤═══╤═══       ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐                ┌──────────────────┐
        │   │   │          ╎ 10.0.20.0/24 ╎  dashed        │ 🏢 HQ — Building │  solid
       (drops to hosts)    ╎  [ cam1 … ]  ╎  tinted        │  [ rack … ]      │
                           └╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘                └──────────────────┘

 Links
   copper / ethernet   A ───────────── B          solid
   fiber               A ──/──/──/──── B          fiber colour + slash ticks
   wireless            A ╌╌╌╌╌╌╌╌╌╌╌╌╌ B          dashed  (or ((  )) arcs between APs)
   serial / WAN        A ───╴╴╶╴───── B           zigzag tick
   PoE                 A ──────⚡PoE──── B          power tag
   VPN tunnel          A ╌╌╌🔒╌╌╌╌╌╌╌╌ B          dashed + lock, arced
   LAG / port-channel  A ═════Po1═════ B          double / thick

 Annotations (on a link)
   ┌Gi0/1            far ┐                          port labels at each end
   A ───────[ trunk · VLAN 10,20 · 1G ]─────── B    mode · vlan · speed mid-link
```

---

## 4. DSL Grammar

Hand-authorable, indentation-tolerant, AI-friendly. Header keyword is **`network`** (also accepts `topology`). `detect()` matches a first non-comment line beginning with `network` or `topology`.

### 4.1 Worked example A — the originating use case: a CCTV camera network

```
network "Acme HQ — CCTV"
  layout: tiered
  direction: tb

  internet  net "Internet"
  router    edge1   "Edge Router"
  firewall  fw1     "Perimeter FW"
  l3switch  core1   "Core SW"        tier: core
  poeswitch poe1    "PoE Switch A"   tier: access
  poeswitch poe2    "PoE Switch B"   tier: access
  nvr       nvr1    "Video Recorder"
  monitor   wall1   "Guard Station"

  subnet cams "192.168.20.0/24" {
    camera cam1 "Lobby Dome"   type: dome   ip: 192.168.20.11
    camera cam2 "Gate PTZ"     type: ptz    ip: 192.168.20.12
    camera cam3 "Dock Bullet"  type: bullet ip: 192.168.20.13
    poe1
    poe2
  }

  net  -- fw1 : wan "ISP 1Gbps"
  fw1  -- edge1
  edge1 -- core1 : fiber 10G
  core1 -- poe1 : trunk vlan: 20 1G port: Gi0/1
  core1 -- poe2 : trunk vlan: 20 1G port: Gi0/2
  core1 -- nvr1 : 1G
  core1 -- wall1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe
  poe2 -- cam3 : poe
```

*The engine validates that `cam1/2/3` IPs fall inside `192.168.20.0/24` (they do), tags the camera subnet, lays out Internet→FW→edge→core on tier bands with the PoE switches on the access band and cameras hanging beneath, and renders PoE links with the power tag. No device or port is dropped — the P0 failure mode is structurally impossible.*

### 4.2 Worked example B — three-tier enterprise campus (the Cisco hierarchical model)

```
network "Driscoll Campus"
  layout: tiered

  internet  inet
  cloud     wan "WAN"

  firewall  fw1 "Core Firewall"      tier: edge
  router    er1 "Edge Router 1"      tier: edge
  router    er2 "Edge Router 2"      tier: edge

  l3switch  cs1 "Core SW 1"          tier: core
  l3switch  cs2 "Core SW 2"          tier: core

  switch    d1  "Dist A"             tier: distribution
  switch    d2  "Dist B"             tier: distribution
  switch    d3  "Dist C"             tier: distribution

  serverfarm farm "Server Farm" count: 4

  a1 a2 a3 a4 : switch tier: access      # shorthand: 4 access switches, same attrs

  inet -- fw1
  wan  -- er1 : serial
  wan  -- er2 : serial
  fw1  -- cs1 : 10G
  er1  -- cs1
  er2  -- cs2
  cs1  == cs2 : lag 40G                   # core uplink, aggregated
  cs1  -- d1
  cs1  -- d2
  cs2  -- d2
  cs2  -- d3
  cs1  -- farm : trunk vlan: 100
  d1 -- a1
  d2 -- a2
  d2 -- a3
  d3 -- a4
```

### 4.3 Worked example C — spine-leaf data-center fabric

```
network "DC Fabric"
  layout: spine-leaf
  spines: sp1 sp2
  leaves: lf1 lf2 lf3 lf4
  # every leaf links to every spine automatically in spine-leaf mode;
  # add host attachments explicitly:
  server h1 ; server h2 ; server h3
  lf1 -- h1 : 25G
  lf2 -- h2 : 25G
  lf4 -- h3 : 25G
```

### 4.4 EBNF

```ebnf
diagram     = header , { directive | device | group | link | shorthand | comment } ;
header      = ("network" | "topology") , [ string ] , newline ;

directive   = "layout:" , layout_kind , newline
            | "direction:" , ("tb" | "lr") , newline       (* tiered/tree flow axis *)
            | "spines:" , id , { id } , newline             (* spine-leaf only *)
            | "leaves:" , id , { id } , newline             (* spine-leaf only *)
            | "legend:" , legend_arg , newline
            | "title:" , string , newline ;
layout_kind = "tiered" | "tree" | "star" | "ring" | "bus"
            | "mesh" | "spine-leaf" | "manual" ;

(* ---- devices ---- *)
device      = kind , id , [ string ] , { dev_attr } , newline ;
kind        = "router" | "switch" | "l3switch" | "multilayer" | "firewall"
            | "loadbalancer" | "lb" | "ap" | "wifi" | "wlc" | "gateway"
            | "modem" | "ids" | "ips" | "proxy" | "vpngw"
            | "server" | "serverfarm" | "servers" | "pc" | "workstation"
            | "laptop" | "mobile" | "phone" | "ipphone" | "voip"
            | "printer" | "storage" | "nas" | "san"
            | "camera" | "nvr" | "dvr" | "poeswitch" | "encoder" | "decoder"
            | "monitor" | "videowall"
            | "internet" | "wan" | "cloud" | "pstn" | "lan" | "segment" ;
dev_attr    = "tier:" , ("core"|"distribution"|"access"|"edge")
            | "type:" , ("fixed"|"bullet"|"dome"|"ptz"|"turret")  (* camera only *)
            | "ip:" , ipv4 [ "/" , number ]
            | "model:" , string
            | "count:" , number                              (* stack/farm size *)
            | "icon:" , id ;                                 (* explicit icon override *)

(* ---- groups (nestable; C4-style blocks) ---- *)
group       = group_kind , id , [ string ] , "{" , newline ,
                  { device | group | id_ref | newline } ,
              "}" , newline ;
group_kind  = "site" | "building" | "campus" | "rack"
            | "subnet" | "vlan" | "zone" | "dmz" ;
id_ref      = id , newline ;                                 (* membership of a pre-declared device *)

(* ---- links ---- *)
link        = id , connector , id , [ ":" , link_spec ] , newline ;
connector   = "--"        (* standard link, undirected (default copper)  *)
            | "->"        (* directed (traffic/uplink direction)         *)
            | "==" ;      (* aggregated / LAG (shorthand for ': lag')    *)
link_spec   = { link_tok } ;
link_tok    = link_type | mode | "vlan:" , vlanlist | "port:" , portspec
            | "ip:" , ipv4 [ "/" , number ] | speed | string ;
link_type   = "copper"|"ethernet"|"fiber"|"wireless"|"serial"|"wan"
            | "poe"|"vpn"|"lag"|"portchannel" ;
mode        = "trunk" | "access" ;
speed       = number , ("M"|"G"|"T") ;                       (* 100M, 1G, 10G, 40G *)
vlanlist    = number , { "," , number } ;
portspec    = bareword , [ ">" , bareword ] ;                (* nearGi0/1 > fareth0 *)

(* ---- shorthand: declare several same-kind devices on one line ---- *)
shorthand   = id , { id } , ":" , kind , { dev_attr } , newline ;

comment     = ("#" | "//") , text , newline ;
id          = letter , { letter | digit | "_" | "-" } ;
string      = '"' , { char } , '"' | "「" , { char } , "」" ;  (* CJK quotes ok *)
ipv4        = number , "." , number , "." , number , "." , number ;
```

### 4.5 AI-friendliness rules

Mirrors the project-wide "Made for AI" pillar — and the P0 we are fixing is *for* AI output:

- **Minimal core first (the 80/20 rule for generation).** A complete diagram needs only `<kind> <id> "label"` device lines plus `a -- b` links — nothing else is mandatory. `layout:`, `tier:`, link types, `vlan:`, `port:`, and `subnet { }` boundaries are all **optional and additive**; they refine a diagram that already renders. Generated DSL should start from the device+link skeleton and add annotations only when the request needs them, because every extra annotation token is one more place to fail. The canonical generation profile (`src/ai/profiles.ts`) deliberately exposes only this minimal surface.
- **No silent drops — ever.** This is the headline. Every device and port the model declares is rendered; a duplicate id is a **readable error** (`device id "cam1" already declared on line 7`) rather than a clobber. An LLM that emits 30 cameras gets 30 cameras.
- **Unknown device kind = readable error**, naming the bad kind and the closest valid kind (`unknown device kind "swtich" on line 4 — did you mean "switch"?`). No guessing.
- **Link to an undeclared id is a readable error** naming the id and line — but a device may be *declared by being referenced inside a group block*, so order-independence holds within a file.
- **CJK quotes** (`「…」`, `『…』`, `"…"`) accepted wherever `"…"` is.
- **Forgiving connectors & whitespace**: `a--b` == `a -- b`; the `:` before a link spec is optional if a link-type keyword leads (`a -- b fiber 10G`).
- **Order-free link spec**: `trunk vlan: 10 1G` == `1G vlan: 10 trunk`.
- **Validation errors are structural, not stylistic**: a bad CIDR membership or out-of-range VLAN reports plainly (`cam9 ip 10.0.0.5 is not inside subnet 192.168.20.0/24 (line 22)`); cosmetic ambiguity never errors.

---

## 5. Layout Rules

The current implementation is deterministic. The engine owns placement, caption sides and routing; generated DSL does not need coordinates or waypoints. The authoritative dimensions are `NET_CONST` and measured icon/text footprints in `src/diagrams/network/layout.ts`.

### 5.1 Placement

- `tiered`: use explicit edge/core/distribution/access tiers and infer unranked neighbors. `tree`: breadth-first ranks from a cloud or highest-degree device. Both use the local band placer, measured captions, group lanes and neighbor alignment; they do not call the Flowchart layout kernel.
- `star`: highest-degree hub and radial spokes. `ring`: peel leaves to identify the cycle core, order it by connectivity and place attached branches outward. `mesh`: deterministic circular placement; no force solver currently runs.
- `bus`: device row placement; no synthetic bus is created by the placer.
- `spine-leaf`: declared spine and leaf bands with auto-mesh links. Other devices are ranked from their connections and placed with the same measured row packing. Every link uses the shared router. Connecting to both tiers does not imply secondary traffic, reduced emphasis or a mandatory perimeter path. All declared links remain rendered.
- `manual`: existing `at: x,y` positions remain supported. They are not part of the minimal LLM generation profile.

### 5.2 Captions and groups

Device captions wrap by measured text width (120 SVG units at 12px), with IP/model sublabels included in their footprint. Intermediate TB devices may put captions to the right to leave vertical connector channels clear; leaves and LR devices normally use captions below. Cloud labels wrap independently and their bodies grow to fit those measured lines.

Non-VLAN groups participate in band placement, and their boundaries contain measured member geometry. Nested groups are inflated inside-out. VLAN membership gets a badge at each member rather than an enclosing rectangle spanning unrelated branches or sites. Arbitrary overlapping logical regions are not fully solved.

### 5.3 Routing

All modes prefer an unobstructed straight connection. Where a caption obstructs that connection, the engine tries short terminal escapes with a diagonal middle segment, then uses the existing Logic orthogonal router when an obstacle requires a detour. Device/caption/header obstacles are hard constraints; wire crossings and proximity are soft costs in Network, so a high-degree device cannot be sealed off by previously drawn links. Cross-tier spine-leaf attachments use individual exterior tracks when those tracks are clear. This is a local heuristic, not a crossing-free or globally optimal guarantee.

Link type controls appearance; labels, fiber marks, port annotations and LAG double paths follow actual route geometry. The SVG extends wires beneath opaque icon artwork so they meet the painted silhouette. Device and caption obstacles govern external routes. Labels may sit on their own link using the text halo, while avoiding other links. Boundary constraints keep label searches local instead of relocating annotations to a distant corner. Route bounds are normalized before adding the title band. Dense layouts still need visual review.

See `docs/issues/26-ecomap-network-visual-layout-audit.md` for retained changes, rejected experiments and current visual limitations.

---

## 6. Styles & Theme Design

> How network visuals derive from the existing Schematex token system, consistent with the other 34 diagrams.

### 6.1 Where network sits in the theme taxonomy

Two stances exist (see `00-OVERVIEW.md` §Theme System): **`IndustrialTokens`** (circuit/ladder/SLD/logic — *forced monochrome* under IEEE/IEC) and **`BaseTheme` + a semantic extension** (most others — house palette in `default`, true B/W in `monochrome`, Schematex slate/blue in `dark`).

**Network belongs to the second group.** It is *not* an IEEE/IEC compliance drawing — the de-facto reference (Cisco icons) is itself **colourful** (Cisco's blue/teal device icons are part of how the diagram "reads as a network"), and TIA-606-D *prescribes colour* for cable types. So a tasteful colour `default` is not just legitimate, it is closer to the standard than monochrome. But the engine must still produce a clean `monochrome` for print/audit. This mirrors `pert`/`flowchart`/`c4`: a coloured house default, with semantics that fall back to shape/line-style in mono.

### 6.2 The `NetworkTokens` semantic extension

Add to `src/core/theme.ts`, alongside `FlowchartTokens` / `TimelineTokens`:

```ts
export interface NetworkTokens {
  deviceFill: string;        // pale icon body fill
  deviceStroke: string;      // icon outline
  deviceAccent: string;      // ports/arrows inside the icon
  cloudFill: string;         // cloud abstraction interior
  cloudStroke: string;
  label: string;             // device id/name
  subLabel: string;          // ip/model sub-label
  /** Link palette by cable type — TIA-606-D-inspired. */
  linkCopper: string;        // neutral stroke
  linkFiber: string;         // TIA orange
  linkWireless: string;      // dashed accent
  linkSerial: string;
  linkPoe: string;
  linkVpn: string;
  linkLag: string;
  linkLabel: string;         // port/speed/vlan annotation text
  /** Boundaries. */
  siteStroke: string;        // physical container border
  subnetStroke: string;      // logical overlay dashed border
  subnetFill: string;        // logical overlay tint
  zoneStroke: string;        // security-zone/dmz border
  /** VLAN colouring + camera/security accent. */
  vlanPalette: readonly string[];
  /** Validation surfacing (subnet mismatch, etc.). */
  warn: string;
}
```

`resolveNetworkTheme(name)` follows the established pattern: `{ ...BASE_THEMES[name], ...NETWORK_TOKENS[name] }`.

### 6.3 Per-theme values

**`default`** — pale device faces, slate outlines and blue port/routing details. This is original Schematex line art, not the Cisco stencil artwork:

| Token | Value | Rationale |
|-------|-------|-----------|
| `deviceFill` | `#f8fafc` | pale device face |
| `deviceStroke` | `#334155` | slate outline |
| `deviceAccent` | `#256b8a` | ports and routing details |
| `cloudFill` | `#ffffff` (`fill`) | clean cloud |
| `cloudStroke` | `#334155` (`stroke`) | |
| `label` | `#0f172a` (`text`) | |
| `subLabel` | `#64748b` (`textMuted`) | ip/model |
| `linkCopper` | `#334155` (`stroke`) | neutral |
| `linkFiber` | `#ea7a17` (TIA fiber orange) | **fiber = orange**, per TIA-606-D |
| `linkWireless` | `#2563eb` (`accent`) dashed | |
| `linkSerial` | `#7c3aed` | leased-line violet |
| `linkPoe` | `#059669` (`positive`) | PoE = "powered/green" |
| `linkVpn` | `#0891b2` dashed + lock | tunnel cyan |
| `linkLag` | `#334155` thick/double | |
| `linkLabel` | `#475569` | |
| `siteStroke` | `#334155` (`stroke`) | solid physical container |
| `subnetStroke` | `#2563eb` (`accent`) dashed | logical overlay |
| `subnetFill` | `#eff6ff` (accent 50) | soft tint |
| `zoneStroke` | `#dc2626` (`negative`) dashed | DMZ/trust-zone = red border |
| `vlanPalette` | `DEFAULT_PALETTE` | per-VLAN link colouring |
| `warn` | `#d97706` (`warn`) | validation mismatch |

**`monochrome`** — clean line-art for print/audit (the compliance-grade stance):

| Token | Value |
|-------|-------|
| `deviceFill` | `#ffffff` |
| `deviceStroke` | `#000000` |
| `deviceAccent` | `#000000` (glyph drawn as outline, not tint) |
| `cloudFill` / `cloudStroke` | `#ffffff` / `#000000` |
| `label` / `subLabel` | `#000000` / `#444444` |
| `linkCopper` | `#000000` (solid) |
| `linkFiber` | `#000000` — *colour can't carry meaning in mono*, so **fiber is shown by its slash ticks**, not orange |
| `linkWireless` / `linkVpn` | `#000000` **dashed** (line-style carries the meaning) |
| `linkSerial` | `#000000` + zigzag tick |
| `linkPoe` | `#000000` + `PoE` text tag |
| `linkLag` | `#000000` **double line** |
| `siteStroke` | `#000000` solid |
| `subnetStroke` / `zoneStroke` | `#000000` **dashed** (no fill tint) |
| `subnetFill` | `none` |
| `vlanPalette` | `MONOCHROME_PALETTE` (VLAN shown as text tag, not colour) |

> Principle (shared with `petri`/`venn`/`industrial`): in `monochrome`, any semantic that rides on colour in `default` falls back to **line-style or a text/shape tag** — dashed for wireless/vpn, slash ticks for fiber, double line for LAG, text `PoE`/`VLAN 10` tags — so a black-and-white print stays unambiguous.

**`dark`** — Schematex slate/blue dark palette, mirroring `DARK_THEME`:

| Token | Value |
|-------|-------|
| `deviceFill` | `#172033` |
| `deviceStroke` | `#cbd5e1` |
| `deviceAccent` | `#7dd3fc` |
| `cloudFill` / `cloudStroke` | `#172033` / `#f8fafc` |
| `label` / `subLabel` | `#f8fafc` / `#cbd5e1` |
| `linkCopper` | `#f8fafc` |
| `linkFiber` | `#fbbf24` (peach) |
| `linkWireless` | `#6d8fff` dashed |
| `linkPoe` | `#34d399` (green) |
| `linkVpn` | `#22d3ee` dashed |
| `subnetStroke` / `subnetFill` | `#6d8fff` / `rgba(109,143,255,0.12)` |
| `zoneStroke` | `#f87171` (red) |
| `vlanPalette` | `DARK_PALETTE` |

### 6.4 Stroke & type scale (reuse `theme.ts` constants)

- Device outline / link body: `STROKE_WIDTH.normal` (2). LAG/backbone-bus: `STROKE_WIDTH.thick` (3).
- Logical-overlay dashes: `STROKE_WIDTH.thin` (1), dash `4 3`; site/physical border solid `STROKE_WIDTH.normal`.
- Device label: `FONT_SIZE.label` (12); ip/port/speed/vlan annotations: `FONT_SIZE.small` (9); title: `FONT_SIZE.title` (16).
- Font: `DEFAULT_FONT_FAMILY`.

### 6.5 House-style rule (one sentence to remember)

**Device bodies use pale line art with ports and distinct role glyphs, clouds neutral; link *type* carried by colour in `default` (fiber-orange, PoE-green, accent-dashed wireless/vpn) and by *line-style/tag* in `monochrome`; logical overlays dashed-tinted, physical containers solid; VLANs draw from `BaseTheme.palette`.** This keeps network in the `c4`/`flowchart`/`pert` coloured-house family, never the forced-mono industrial family.

---

## 7. Legend

The network engine does not currently render a legend. The parser accepts `legend:` but ignores its value. Device labels and link annotations carry the displayed meaning; automatic link-type, VLAN, boundary, and warning keys are not implemented.

---

## 8. Output Contract

- Root `<svg>` carries `data-diagram-type="network"`, `role="img"`, `aria-label` = title or "Network diagram".
- `<title>` / `<desc>` summarise device counts by class, link counts by type, boundary counts, the **detected topology class** (star / ring / bus / mesh / tree / hierarchical / spine-leaf), and any validation warnings (subnet mismatches, out-of-range VLANs, non-switch trunks).
- Devices: `<g class="sx-net-device" data-id="…" data-kind="router|switch|…" [data-tier] [data-ip] [data-type]>`.
- Clouds: `<g class="sx-net-cloud" data-kind="internet|wan|pstn|cloud">`.
- Links: `<g class="sx-net-link" data-from="…" data-to="…" data-type="copper|fiber|wireless|serial|poe|vpn|lag" [data-vlan] [data-speed] [data-mode] [data-port-near] [data-port-far]>`.
- Boundaries: `<g class="sx-net-boundary" data-kind="site|rack|subnet|vlan|zone|dmz" data-label="…">`.
- Theme via `resolveNetworkTheme`; strokes/fills from tokens only — no inline styles (hard constraint #3). Built with `src/core/svg.ts` only.

---

## 9. Canonical Test Cases

Fixtures the implementation must satisfy (parser + layout + golden-string e2e). Each lists the DSL and the assertions that matter.

### TC-1 — Minimal star LAN
```
network "Home"
  layout: star
  router gw "Gateway"
  pc pc1
  laptop lt1
  printer pr1
  gw -- pc1
  gw -- lt1 : wireless
  gw -- pr1
```
*Assert:* 4 devices, 3 links; `gw` placed at the hub centroid, the three endpoints on an even-angle circle at `STAR_HUB_GAP`; the `gw--lt1` link is **dashed** (`data-type="wireless"`); detected topology class = "star" in `<desc>`; no device dropped.

### TC-2 — Three-tier enterprise campus (Cisco hierarchical model)
```
network "Campus"
  layout: tiered
  firewall fw1 tier: edge
  l3switch cs1 tier: core
  l3switch cs2 tier: core
  switch d1 tier: distribution
  switch d2 tier: distribution
  switch a1 tier: access
  switch a2 tier: access
  fw1 -- cs1
  cs1 == cs2 : lag 40G
  cs1 -- d1 ; cs2 -- d2
  d1 -- a1 ; d2 -- a2
```
*Assert:* devices band into edge/core/distribution/access rows top→bottom; `cs1==cs2` renders as a **double/thick** LAG link with a `40G` label and `data-type="lag"`; banding order matches `data-tier`; detected class = "hierarchical".

### TC-3 — CCTV camera network with subnet + PoE (the originating use case)
```
network "CCTV"
  layout: tiered
  l3switch core1 tier: core
  poeswitch poe1 tier: access
  nvr nvr1
  subnet cams "192.168.20.0/24" {
    camera cam1 type: dome ip: 192.168.20.11
    camera cam2 type: ptz  ip: 192.168.20.12
    poe1
  }
  core1 -- poe1 : trunk vlan: 20 1G
  core1 -- nvr1
  poe1 -- cam1 : poe
  poe1 -- cam2 : poe
```
*Assert:* `cam1` renders the **dome** silhouette, `cam2` the **PTZ** silhouette; both IPs validate inside `192.168.20.0/24` (no error); the `cams` subnet draws a dashed tinted boundary enclosing cam1/cam2/poe1; PoE links render with the `⚡PoE`/green styling and `data-type="poe"`; `core1--poe1` shows `trunk · VLAN 20 · 1G`. *Negative:* changing `cam2` to `ip: 10.0.0.9` raises `cam2 ip 10.0.0.9 is not inside subnet 192.168.20.0/24`.

### TC-4 — Spine-leaf fabric (auto-mesh)
```
network "Fabric"
  layout: spine-leaf
  spines: sp1 sp2
  leaves: lf1 lf2 lf3
  server h1
  lf1 -- h1 : 25G
```
*Assert:* `sp1 sp2` on the top row, `lf1 lf2 lf3` on the bottom row; **6 auto-generated spine↔leaf links** (every leaf to every spine) present in addition to the explicit `lf1--h1`; `h1` hangs below `lf1`; detected class = "spine-leaf".

### TC-5 — Validation + no-drop guarantee
```
network
  switch sw1
  pc a ; pc b ; pc c ; pc d ; pc e
  sw1 -- a ; sw1 -- b ; sw1 -- c ; sw1 -- d ; sw1 -- e
  ipphone vp1 vlan-test
  sw1 -- vp1 : access vlan: 5000
```
*Assert:* all 6 devices + 6 links render (no drop, even with the dense fan-out — the P0 regression guard); VLAN `5000` raises an out-of-range warning (`VLAN id 5000 out of range 1–4094`) surfaced in `<desc>` while still rendering. *Negative:* a second `pc a` raises `device id "a" already declared`.

---

## 10. Deviations From the Standard

- **Original icon art, not Cisco's.** Cisco's icons are the de-facto standard but are licensed for use **only unaltered**, and the hard "hand-write everything / zero-dependency" constraint forbids shipping foreign asset files anyway. Schematex therefore draws its **own original line-art** that follows the *conventional silhouettes* (router = puck with curved arrows, L2 switch = rack face with ports, firewall = brick wall, cloud = Internet/WAN). The silhouettes are functional conventions, not Cisco's specific artwork. Tools that ship the actual Cisco EPS/Visio stencils (Lucidchart, draw.io) take a different, asset-licensed path; Schematex's path is the legally-clean and dependency-free one.
- **No single formal standard exists.** Unlike IEEE 315 (circuits) or ISA-5.1 (P&ID), there is no ISO/IEC/IEEE drawing standard for network topology. Schematex composes its baseline from the de-facto sources (Cisco icons, the hierarchical/spine-leaf models, TIA-606-D colour, ONVIF roles) and says so plainly rather than pretending to a standard that doesn't exist.
- **Logical and physical in one model.** Real practice often splits "physical" (cabling/racks) from "logical" (IP/VLAN) network diagrams. Schematex v0.1 represents both in one DSL via boundary kinds (site/rack are physical, subnet/vlan/zone are logical overlays) rather than two diagram types; a dedicated `view: physical|logical` toggle that hides one layer is deferred (§11).
- **Topology classes are layout *modes*, not separate engines.** star/ring/bus/mesh/tree/tiered/spine-leaf are `layout:` directives over one device/link model, not seven diagram types — so a hybrid (a tree of stars, the most common real topology) is expressible by nesting groups under `tiered`/`tree`.
- **Auto-mesh in spine-leaf.** In `spine-leaf` mode the engine *generates* the full spine↔leaf link set rather than requiring the author to type N×M links — a deliberate convenience that matches how the fabric is always wired. Authors can still add/override host links explicitly.

---

## 11. Deferred (post-v0.1)

Each has a slot in §2 so adding it is additive — no DSL or type breakage:

- **Live-discovery import** — build the model from SNMP / LLDP / CDP / Nmap / a NetBox export. The single biggest "Auvik-class" feature; belongs in a separate importer, not the renderer.
- **Logical/physical view toggle** — `view: physical|logical` hiding the other layer from one source model.
- **Rack-elevation diagrams** — the front-of-rack U-height view (a different, dedicated layout); related but distinct from topology.
- **L3 path / reachability computation** — compute and highlight the route between two hosts across the topology (the network analogue of `pert` scheduling / `petri` firing). High-value, non-trivial; a later differentiator.
- **SPOF / redundancy analysis** — articulation-point and bridge detection surfaced as resilience warnings.
- **Legacy + niche device icons** — dedicated hub/bridge silhouettes (both names currently alias `switch`), ATM/Frame-Relay switch, intercom.
- **Arbitrary overlapping logical regions** — a device in many overlapping subnets/VLANs/zones drawn as true overlapping translucent regions (Euler-style) rather than the v0.1 box-plus-halo approximation.
- **Routing protocol annotation** (`proto: ospf|bgp|eigrp`) and per-link metrics/cost labels.
- **Cloud-provider icon packs** (AWS/Azure/GCP) — the `mingrammer/diagrams` niche; out of scope until there is clear demand, and would follow the same original-art rule as the Cisco silhouettes.
```
