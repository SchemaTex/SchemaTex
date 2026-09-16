# Network symbol inventory

This lists the network device icons and link styles in three tiers. Usage comes from a 90-day ChatDiagram sample (670 distinct network users, owner account excluded). Counts measure either declared kinds or device-label demand for specific roles, such as a database labelled "Primary DB" on a server. These sample counts do not measure adoption of the full parser vocabulary. Tier 1 covers essential devices, Tier 2 covers additional device roles, and Tier 3 covers link styles.

Network icons follow the Cisco topology-icon convention, redrawn as original line art in the exemplar's style; there is no formal published standard to cite, so each entry's standard field names the convention it follows.

## Tier 1

| Symbol | DSL name | Users (90 days) | Engine catalog id | Status |
|---|---|---|---|---|
| Server | `server` | 530 | `server` | Drawn |
| Desktop workstation | `pc`, `workstation` | 408 | `pc` | Drawn |
| Layer 2 switch | `switch` | 388 | `switch` | Drawn |
| Firewall | `firewall` | 351 | `firewall` | Drawn |
| Router | `router` | 259 | `router` | Drawn |
| Database server | `database`, `db`, `dbserver` | 146 | `database` | Drawn |
| Internet | `internet` | 434 | `internet` | Drawn |
| Layer 3 switch | `l3switch`, `multilayer` | 261 | `l3switch` | Drawn |
| Cloud network | `cloud` | 224 | `cloud` | Drawn |
| Wireless access point | `ap`, `wifi` | 209 | `ap` | Drawn |
| Rack storage array | `storage` | 168 | `storage` | Drawn |
| Laptop | `laptop` | 151 | `laptop` | Drawn |
| Fixed box camera | `camera cam type: fixed` | 115 | `camera` | Drawn |
| Bullet camera | `camera cam type: bullet` | 115 | `camera` | Drawn |
| Dome camera | `camera cam type: dome` | 115 | `camera` | Drawn |
| Pan-tilt-zoom camera | `camera cam type: ptz` | 115 | `camera` | Drawn |
| Turret camera | `camera cam type: turret` | 115 | `camera` | Drawn |
| Network printer | `printer` | 113 | `printer` | Drawn |

## Tier 2

| Symbol | DSL name | Users (90 days) | Engine catalog id | Status |
|---|---|---|---|---|
| IP desk phone | `ipphone`, `voip` | 84 | `ipphone` | Drawn |
| Network gateway | `gateway` | 78 | `gateway` | Drawn |
| Power-over-Ethernet switch | `poeswitch` | 75 | `poeswitch` | Drawn |
| Load balancer | `loadbalancer`, `lb` | 74 | `loadbalancer` | Drawn |
| Security monitor | `monitor`, `videowall` | 67 | `monitor` | Drawn |
| Network video recorder | `nvr` | 66 | `nvr` | Drawn |
| Mobile phone | `mobile`, `phone` | 61 | `mobile` | Drawn |
| VPN gateway | `vpngw` | 51 | `vpngw` | Drawn |
| Server farm | `serverfarm`, `servers` | 49 | `serverfarm` | Drawn |
| Modem | `modem` | 34 | `modem` | Drawn |
| Wide-area network | `wan` | 21 | `wan` | Drawn |
| Wireless LAN controller | `wlc` | 20 | `wlc` | Drawn |
| Intrusion detection appliance | `ids`, `ips` | 20 | `ids` | Drawn |
| Proxy appliance | `proxy` | 17 | `proxy` | Drawn |
| LAN segment | `lan`, `segment` | 10 | `lan` | Drawn |
| Digital video recorder | `dvr` | 5 | `dvr` | Drawn |
| Video encoder | `encoder`, `decoder` | 5 | `encoder` | Drawn |
| Public telephone network | `pstn` | 4 | `pstn` | Drawn |
| Hypervisor host | `hypervisor` | 66 | `hypervisor` | Drawn |
| Desktop NAS | `nas` | 56 | `nas` | Drawn |
| Point-to-point wireless bridge | `wireless-bridge` | 51 | `wireless-bridge` | Drawn |
| Software container | `container` | 36 | `container` | Drawn |
| Cellular router | `cellular-router` | 34 | `cellular-router` | Drawn |
| Satellite terminal | `satellite-terminal` | 34 | `satellite-terminal` | Drawn |
| Door access controller | `access-control` | 27 | `access-control` | Drawn |
| IoT sensor | `iot-sensor` | 26 | `iot-sensor` | Drawn |
| Wall display / TV | `display` | 23 | `display` | Drawn |
| Storage area network | `san` | 21 | `san` | Drawn |
| Optical line terminal | `olt` | 18 | `olt` | Drawn |
| Optical network terminal | `ont` | 18 | `ont` | Drawn |
| Private telephone exchange | `pbx` | 15 | `pbx` | Drawn |
| Tablet | `tablet` | 15 | `tablet` | Drawn |
| DIN-rail PLC | `plc` | 13 | `plc` | Drawn |
| Uninterruptible power supply | `ups` | 12 | `ups` | Drawn |
| Industrial touch panel | `hmi` | 9 | `hmi` | Drawn |
| Fiber media converter | `media-converter` | 8 | `media-converter` | Drawn |
| Point-of-sale terminal | `pos-terminal` | 8 | `pos-terminal` | Drawn |
| Passive patch panel | `patch-panel` | 5 | `patch-panel` | Drawn |

## Tier 3 — link styles

| Symbol | DSL name | Users (90 days) | Engine catalog id | Status |
|---|---|---|---|---|
| Copper Ethernet link | `a -- b : copper`, `a -- b : ethernet` | — | — | Drawn; not in the engine catalog |
| Optical fiber link | `a -- b : fiber` | — | — | Drawn; not in the engine catalog |
| Wireless link | `a -- b : wireless` | — | — | Drawn; not in the engine catalog |
| VPN tunnel link | `a -- b : vpn` | — | — | Drawn; not in the engine catalog |
| Aggregated link | `a -- b : lag`, `a -- b : portchannel` | — | — | Drawn; not in the engine catalog |
| Power-over-Ethernet link | `a -- b : poe` | — | — | Drawn; not in the engine catalog |
| Serial / leased circuit | `a -- b : serial`, `a -- b : wan` | — | — | Drawn; not in the engine catalog |

## Engine coverage

Every device kind listed here is accepted by the parser and has a `NETWORK_KINDS` catalog entry, including `wan`, `lan` and `pstn`. `database`, `db` and `dbserver` select the database cylinder; `storage`, `nas` and `san` select distinct device forms. The engine fits device artwork to its own boxes and theme palette. Cloud forms include the device name beneath their pictorial qualifier.

The seven link styles remain outside the device symbol catalog; their `engine` fields are null.

Two pairs share one count, because the usage query matched their labels together: cellular router and satellite terminal share 34 users (labels naming LTE, 5G, cellular, satellite or Starlink), and the optical line and network terminals share 18 (labels naming OLT, ONT or GPON). Treat each figure as the demand for the pair, not for each kind.
