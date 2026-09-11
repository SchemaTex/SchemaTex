Promoted from the case `network-industrial-plant-ethernet` after Victor reviewed it: a water-plant industrial Ethernet with an IT firewall, an OT firewall, an Industrial DMZ holding the DMZ switch and historian, and an OT control zone with a SCADA server feeding a four-switch MRP fiber ring that serves two HMIs and two PLCs.

Why it works as the exemplar for this type:

- Zones are drawn as nested rounded frames — the DMZ dashed and warm-tinted, the OT zone solid and cool-tinted — so the security boundary reads before any device does.
- Devices use one consistent line-art icon family (firewall brick, switch with port dots, server with drive bays, monitor) with the name in bold under or beside the icon and the IP address in a lighter second line.
- Link type is carried by colour and weight: fiber ring segments are thick teal, copper drops are thin grey, and every segment carries its own label (`fiber · MRP ring`, `trunk · VLAN 20 · 1G`, `access · VLAN 10`) placed in the clear beside the line, never on it.
- The ring is drawn as a real closed rectangle with the four managed switches at the corners, so the redundancy topology is visible at a glance; the end devices hang outward from the corners.
- Everything is orthogonal, nothing crosses, and the canvas is a compact 4:3 with a title and a one-line subtitle.

Palette: ink #1e293b, fiber teal #0f766e, copper grey #64748b, DMZ tint #fff7ed with #d97706 dashed border, OT tint #f0f9ff with #334155 border, firewall brick #fed7aa / #9a3412.
