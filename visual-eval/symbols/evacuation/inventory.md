# Evacuation plan (ISO) — safety-sign inventory

This lists every sign an ISO 23601 escape and evacuation plan can need, split into three tiers, and records what the engine can already draw. Usage data can't rank the signs: only 18 ChatDiagram users made evacuation diagrams in the snapshot window, too few to show which signs matter. The ranking instead follows what ISO 23601 says a posted plan must show: where the reader is standing, the escape routes and exits, the firefighting equipment and fire alarm, the first-aid and rescue equipment, and the assembly point. **Tier 1** is what appears on almost every plan and is drawn in the exemplar's style. **Tier 2** is the rest of the engine's catalog (`getSymbolCatalog("evacuation")`, 29 entries). **Tier 3** is ISO 7010 signs the engine has no entry for. Every pictogram follows the image content that ISO 7010 registers for its code; all geometry is original.

Signs with a first-aid cross or flame carry it because the registered sign does. ISO 7010 describes a flame on every fire-equipment sign (the red F-series) and a first-aid cross on the green safe-condition signs for medical equipment (the emergency telephone, AED, eyewash, safety shower, stretcher and doctor among them), so a sign without them is a different drawing from the registered one.

## Tier 1 (16)

| Sign | DSL name | ISO 7010 code | Required by ISO 23601? | Engine catalog id | Status |
|---|---|---|---|---|---|
| You are here | `here` | none (ISO 23601 location marker) | Yes, on every plan | `here` | Accepted sample |
| Emergency exit, right hand | `exit` (`hand right`) | E002 | Yes, every exit | `exit` | Accepted sample |
| Emergency exit, left hand | `exit` (`hand left`) | E001 | Yes, every exit | `exit` | Drawn |
| Final exit | `exit-final` (`hand right`) | E002 base pictogram + plan threshold qualifier | Yes, ISO 23601 §6 / NFPA 170 Ch.11 | `exit-final` | Drawn — accepted green plate with engine threshold qualifier |
| Exit with direction arrow, right | `exit-direction` (`hand right`) | E002 + ISO 3864-3 arrow | Yes, along escape routes | `exit-direction` | Drawn |
| Exit with direction arrow, left | `exit-direction` (`hand left`) | E001 + ISO 3864-3 arrow | Yes, along escape routes | `exit-direction` | Drawn |
| Evacuation assembly point | `assembly` | E007 | Yes | `assembly` | Drawn |
| Fire extinguisher | `extinguisher` | F001 | Yes, where installed | `extinguisher` | Accepted sample |
| Fire alarm call point | `call-point` | F005 | Yes, where installed | `call-point` | Accepted sample |
| First aid | `first-aid` | E003 | Yes, where provided | `first-aid` | Accepted sample |
| Automated external defibrillator | `aed` | E010 | Yes, where provided | `aed` | Drawn |
| Fire hose reel | `hose-reel` | F002 | Yes, where installed | `hose-reel` | Drawn |
| Emergency telephone | `emergency-phone` | E004 | Yes, where provided | `emergency-phone` | Drawn |
| Collection of firefighting equipment | `fire-equipment` | F004 | Yes, where provided | `fire-equipment` | Drawn |
| Eyewash station | `eyewash` | E011 | Where provided (labs, workshops, chemical areas) | `eyewash` | Drawn |
| Safety shower | `safety-shower` | E012 | Where provided (labs, workshops, chemical areas) | `safety-shower` | Drawn |

ISO 7010 has no separate "final exit" pictogram. The `exit-final` target uses the accepted E002-style runner and green plate with the engine’s threshold bar beneath the doorway as a plan qualifier. It has its own tier-1 manifest entry because the evacuation validator uses final exits for exit coverage and escape-route destinations (ISO 23601 §6 / NFPA 170 Ch.11).

ISO 7010 withdrew its stand-alone direction arrows (E005 and E006). A direction is always shown as an exit sign with the ISO 3864-3 arrow beside it, on the side of travel, which is why the arrow signs are combination signs rather than arrows alone.

## Tier 2 — rest of the engine catalog (15)

| Sign | DSL name | ISO 7010 code | Required by ISO 23601? | Engine catalog id | Status |
|---|---|---|---|---|---|
| Evacuation temporary refuge | `refuge` | E024 | Yes, where provided | `refuge` | Drawn. The engine draws a US (NFPA 170) area-of-refuge glyph; the ISO sign is a wheelchair user with four arrows pointing in from the corners. |
| Protection shelter | `shelter` | E021 | Where provided | `shelter` | Drawn. The engine draws a house outline; the ISO sign is four figures inside a hexagon with a shield. |
| Stretcher | `stretcher` | E013 | Where provided | `stretcher` | Drawn. The engine's figure lies on a bench and has no first-aid cross. |
| Doctor | `doctor` | E009 | Where provided | `doctor` | Drawn. The engine has the figure and stethoscope but no first-aid cross. |
| Break to obtain access | `break-glass` | E008 | Where fitted on the escape route | `break-glass` | Drawn. The engine draws a cracked box; the ISO sign is a fist holding a bar against a star-shaped break. |
| Emergency escape ladder | `escape-ladder` | E016 (window with ladder) or E059 (fixed ladder) | Yes, where provided | `escape-ladder` | Drawn. The engine labels a window-plus-ladder drawing E016 but names it "escape ladder", which is E059; the two need separate entries. |
| Rescue window | `rescue-window` | E017 | Where provided | `rescue-window` | Drawn. The ISO sign adds a fire-service vehicle with a ladder, which the engine lacks. |
| Door opens by pushing | `emergency-door-push` | E022 (left) / E023 (right) | Where fitted on the escape route | `emergency-door-push` | Drawn. The engine draws a person at a door; the ISO sign is a door swinging outwards with a curved arrow. |
| Door slides to open | `emergency-door-slide` | E033 (right) / E034 (left) | Where fitted on the escape route | `emergency-door-slide` | Drawn. Close to the registered layout (door with an arrow). |
| Fire ladder | `fire-ladder` | F003 | Where installed | `fire-ladder` | Drawn. The ISO ladder has converging rails with six rungs and a flame; the engine's rails are parallel with no flame. |
| Fire emergency telephone | `fire-phone` | F006 | Where installed | `fire-phone` | Drawn. Same handset as the E004 drawing plus the shared flame; the engine has no flame. |
| Fire-service riser / dry riser | `riser` | none registered | National rule only | `riser` | Drawn. No ISO 7010 sign exists; the ISO variant needs a documented national sign or a text label. |
| Not an exit | `not-an-exit` | none registered | No (US NFPA 170 only) | `not-an-exit` | Drawn. No ISO 7010 sign; the engine's red square with a slash looks like a fire-equipment sign in ISO colours. |
| Do not use lift in case of fire | `no-elevator` | P020 | Where lifts are near the route | `no-elevator` | Drawn. P020 is a prohibition sign (red ring and slash on white); the engine draws a red square plate, which in ISO colours means fire equipment. |
| Alarm sounder / strobe | `alarm-sounder` | F018 (fire alarm flashing light) is the nearest | Where installed | `alarm-sounder` | Drawn. No ISO sign exists for a sounder; F018 covers the visual alarm. |

The engine also draws two structural door marks outside the catalog, `fire-door` and `smoke-door`. They are architecture drawn on the door, not signs, and stay out of this inventory; the registered sign for a fire door is F007, listed in tier 3.

## Tier 3 — ISO 7010 signs the engine lacks

Ship-only signs (liferafts, lifeboats, lifejackets, marine radios and so on) are left out: they don't appear on building escape plans.

| Sign | DSL name | ISO 7010 code | Required by ISO 23601? | Engine catalog id | Status |
|---|---|---|---|---|---|
| Emergency exit for people unable to walk | none | E026 (left) / E030 (right) | Yes, where an accessible exit exists | none | Drawn; not in the engine |
| Evacuation chair | none | E060 | Yes, where provided | none | Drawn; not in the engine |
| Escape ladder (permanently fixed) | none | E059 | Yes, where provided | none | Drawn; not in the engine (see `escape-ladder` in tier 2) |
| Evacuation lift | none | E070 | Yes, where provided | none | Drawn; not in the engine |
| Fire blanket | none | F016 | Where provided | none | Drawn; not in the engine |
| Fire protection door | none | F007 | Where the door is signed | none | Drawn; not in the engine (only the structural `fire-door` mark) |
| Firefighters' lift | none | F017 | Where installed | none | Drawn; not in the engine |
| Fire alarm flashing light | none | F018 | Where installed | none | Drawn as fire-alarm-flashing-light; not in the engine |
| Wheeled fire extinguisher | none | F009 | Where installed | none | Drawn; not in the engine |
| Emergency descent device | none | E073 | Where provided | none | Drawn; not in the engine |
| Evacuation mattress | none | E067 | Where provided (hospitals, care homes) | none | Drawn; not in the engine |
| Evacuation equipment | none | E076 | Where provided | none | Drawn; not in the engine |
| First aid responder | none | E064 | Optional | none | Drawn; not in the engine |
| Medical grab bag | none | E027 | Optional | none | Drawn; not in the engine |
| Emergency escape breathing device | none | E029 | Where provided | none | Drawn; not in the engine |
| Oxygen resuscitator | none | E028 | Optional | none | Drawn; not in the engine |
| Emergency hammer | none | E025 | Optional | none | Drawn; not in the engine |
| Door opens by pulling | none | E057 (left) / E058 (right) | Where fitted on the escape route | none | Drawn; not in the engine |
| Turn to open | none | E018 (anticlockwise) / E019 (clockwise) | Where fitted on the escape route | none | Drawn; not in the engine |
| Emergency stop button | none | E020 | Optional | none | Drawn; not in the engine |
| Natural disaster outdoor refuge area | none | E065 | Site plans only | none | Drawn; not in the engine |
| Tsunami evacuation area / building | none | E062 / E063 | Coastal sites only | none | Drawn; not in the engine |
| Fixed fire extinguishing installation | none | F012 | Industrial sites | none | Drawn; not in the engine |
| Remote release station | none | F014 | Industrial sites | none | Drawn; not in the engine |
| Fixed extinguishing battery / bottle | none | F008 / F013 | Industrial and marine sites | none | Drawn; not in the engine |
| Foam applicator / water fog applicator / fire monitor | none | F010 / F011 / F015 | Industrial sites | none | Drawn; not in the engine |
| Unconnected fire hose | none | F019 | Where installed | none | Drawn; not in the engine |

## Missing from the engine

These are basic things an ISO 23601 plan shows that the DSL cannot express yet.

- **Accessible emergency exit (E026/E030).** Plans for public buildings mark the exits a wheelchair user can use; `route accessible` draws the route but there is no sign for the exit itself.
- **Evacuation chair (E060).** Multi-storey buildings that rely on assisted evacuation must show where the chairs are kept.
- **Escape ladder (E059).** The engine's `escape-ladder` actually draws the window-with-ladder sign (E016), so a fixed ladder has no correct sign.
- **Refuge area in ISO form (E024).** `refuge` only exists as the US NFPA glyph, so an ISO plan cannot show a temporary refuge correctly.
- **Evacuation lift (E070) and firefighters' lift (F017).** Lifts are either forbidden in a fire (`no-elevator`) or have no sign; the plan can't mark a lift that is meant for evacuation.
- **Fire blanket (F016).** Common in kitchens and labs and listed on plans alongside extinguishers.
- **Fire door (F007) and "fire door keep shut".** The plan can draw a fire door as architecture, but not the F007 sign; "fire door keep shut" is a UK national sign (BS 5499), not ISO 7010, so an ISO plan would state it in the legend instead.
- **Prohibition signs as prohibition signs (P020).** The engine only has square plates, so "do not use lift" comes out in fire-equipment form; ISO needs the red ring and slash.
- **The reader's line of sight.** ISO 23601 requires the plan to be oriented to the direction the reader faces; `here` marks a point but cannot say which way the reader is looking.
- **Final exit door in an outside wall.** A door can only be placed between two declared rooms, so the final discharge door has no geometry of its own (the exemplar had to draw it by hand).

## Decisions for Victor

Each is a place where the library departs from the accepted exemplar or the engine to follow ISO 7010.

1. **No separate final-exit pictogram.** The exemplar and engine add a threshold bar under the doorway for final exits. ISO 7010 has no such sign, so `exit-final` should draw plain E001/E002.
2. **Direction signs are two full squares (60 × 30 px) with an ISO 3864-3 shafted arrow and no divider.** The exemplar shrinks both halves onto a 52 × 30 px carrier, uses a plain triangle, and draws a faint dividing line that sits against the doorway and reads as a second door frame; the full-size version keeps the runner identical to the stand-alone exit sign.
3. **Assembly point shows people.** The exemplar's arrows point at an empty square from the sides; the registered sign has two figures and a third head, with the arrows coming in from the corners.
4. **F004 is a fire helmet, not a flame with a plus.** The registered image content is a helmet in profile with a flame; the engine's drawing shows neither.
5. **First-aid crosses and flames are added where ISO 7010 registers them** (E004, E010, E011, E012; F002, F004), even though none of the engine's versions have them.
6. **The hose reel shows five hose turns instead of the registered seven**, because seven lines merge into a solid block at 30 px.
