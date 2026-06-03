# 43 — Git Graph Standard Reference

> **Status:** RESEARCH — standard landscape + Mermaid `gitGraph` grammar + reference images captured 2026-06-03 by assistant; implementation pending (Victor).

*The commit-history diagram every developer recognises — **commits** as nodes laid out chronologically along **per-branch swimlanes**, with **branch / checkout** operations opening lanes, **merge** operations joining them, plus **cherry-pick** and **tag** annotations. There is no formal published standard: the references are git's own underlying **DAG model** and the **de-facto Mermaid `gitGraph` syntax** that the LLM/developer world already expects. Unlike most Schematex diagrams the engine's job is **layout, not analysis** — assign each commit to a lane and order it chronologically so merges read cleanly — which is exactly the gap generic graph tools fail at. It belongs in a developer/software cluster, a lighter sibling to the structural UML and architecture diagrams.*

---

## Primary references

> The git-graph diagram has **no ISO / IEEE / OMG standard**. There are exactly two anchors: git's *real* data model, and Mermaid's *de-facto* text syntax. Schematex targets the second for compatibility and the first for correctness.

- **Mermaid `gitGraph` documentation.** https://mermaid.js.org/syntax/gitgraph.html — *verified 2026-06-03.* The de-facto syntax standard and Schematex's compatibility target. Source markdown (more complete, includes config/theme blocks): https://github.com/mermaid-js/mermaid/blob/develop/docs/syntax/gitgraph.md — *verified 2026-06-03.* Defines `commit` / `branch` / `checkout` (alias `switch`) / `merge` / `cherry-pick`, the `id:` / `tag:` / `type:` commit options, the `LR:` / `TB:` / `BT:` orientation, and the `gitGraph` config + `themeVariables` blocks (`git0`–`git7` lane colours, `parallelCommits`, `mainBranchName`, …).
- **Chacon, Scott & Straub, Ben.** *Pro Git,* 2nd ed. Apress, 2014. ISBN 978-1-4842-0076-6 *(⚠️ the ISBN in the prior scaffold, 978-1484200773, was a near-miss; confirm the exact print run — the canonical print ISBN-13 is 978-1-4842-0076-6).* Free, continuously updated, at https://git-scm.com/book — *verified 2026-06-03.* The authoritative description of git's commit DAG, branches as movable pointers, fast-forward vs. three-way merge, and tags. The "Git Branching" chapter is the source of truth for what the layout must faithfully represent.
- **git documentation — `git log --graph`.** https://git-scm.com/docs/git-log — *verified 2026-06-03.* git's own ASCII commit-graph renderer; the canonical reference for how a real commit DAG is drawn into lanes (and the upstream of the "lane assignment is the hard part" insight).
- **Atlassian Git tutorials** — branching and merging, with the widely-recognised teaching diagrams. https://www.atlassian.com/git/tutorials/using-branches and https://www.atlassian.com/git/tutorials/using-branches/git-merge — *verified 2026-06-03.* Useful for the conventional *visual* vocabulary (fast-forward vs. 3-way merge, feature-branch fork-and-rejoin) and the Git-Flow / feature-branch workflow shapes users expect.
- **Wikipedia, "Git"** (data-model section). https://en.wikipedia.org/wiki/Git — background on the content-addressed commit DAG. *Background only — not a layout authority.*

*Take-away:* be **Mermaid-`gitGraph`-compatible at the DSL level** (so LLM-generated git graphs render unchanged) while owning a cleaner, deterministic lane-assignment layout than Mermaid's.

---

## 0. Positioning

Git graphs are among the most-requested developer diagrams — onboarding docs, branching-strategy explainers (Git Flow, GitHub Flow, trunk-based), and "what happened to this branch?" post-mortems. Mermaid popularised the `gitGraph` block, so a large fraction of LLM-generated diagram requests already arrive in that exact syntax; rendering it faithfully is a direct ChatDiagram / MyMap win. This diagram sits in the **developer / software** family, lighter than the UML and C4 architecture diagrams but in the same audience.

Be honest about what this is: a **layout + compatibility play, not a computation play**, and a **high-volume** one. There is no schedule to compute (PERT), no cut set (FTA), no marking dynamics (Petri). The entire value is (a) accepting Mermaid `gitGraph` text unchanged and (b) producing a *readable* lane layout where merges don't tangle. The hard, valuable problem is **lane assignment**: place each commit on its branch's horizontal (or vertical) swimlane, order commits by their position in the history, and route merge edges between lanes with minimal crossing. git's own `--graph` and Mermaid both wrestle with this; a clean, deterministic lane allocator (stable enough for golden-string tests) is the deliverable. Suggested keyword: **`gitgraph`** (with `gitGraph` accepted, Mermaid parity).

---

## Element vocabulary

| Operation / element | Meaning | Conventional notation (observed in Mermaid render) |
|---|---|---|
| **`commit`** | a new commit on the current branch | **solid filled circle** in the current lane's colour, one step further along the time axis |
| **`commit type: NORMAL`** | default commit | solid filled circle (same as plain `commit`) |
| **`commit type: REVERSE`** | a reverting commit | filled circle with an inner cross / crossed marker |
| **`commit type: HIGHLIGHT`** | an emphasised commit | larger **open square** outline in the lane colour (visibly distinct from a dot) |
| **`commit id: "x"`** | explicit commit id (else auto `n-hash`) | id printed below the dot, **rotated ~45°** (`rotateCommitLabel`) |
| **`commit tag: "v1.0"`** | a named tag on the commit | small **tag pill / flag** above-or-beside the dot |
| **`branch name`** | create a branch pointer **and a new lane**, switch to it | opens a new swimlane; a coloured **elbow** drops from the parent lane to the new lane at the fork point |
| **`branch name order: n`** | force the lane's vertical order | overrides first-appearance ordering |
| **`checkout name`** / **`switch name`** | make `name` the current branch | subsequent commits land on that lane (no new node) |
| **`merge name`** | merge branch `name` into current branch | a **merge commit** (drawn as an **open / double circle**) on the current lane, with a coloured **curve** rising from the merged branch's tip into it |
| **`merge name id:/tag:/type:`** | merge commit with explicit id / tag / styled node | as above + label/badge |
| **`cherry-pick id: "x"`** | copy commit `x` onto the current branch | a new commit on the current lane annotated as a cherry-pick of the source id (`parent:` required when the source is a merge commit) |
| **branch lane** | the horizontal (LR) or vertical (TB/BT) track for one branch | a thick **coloured swimlane line**; colour from the `git0`–`git7` cycle |
| **branch label** | the branch's name | a coloured **pill at the lane head** (left in LR), matching the lane colour |
| **HEAD / current branch** | the branch new commits attach to | implied by the last `checkout` / `branch` |

**Commit-id default.** When `id:` is omitted Mermaid auto-generates an id of the form `n-<hash>` where `n` is the sequential commit index (e.g. `1-0e5ba84`, `2-777235d`). Our auto-ids should follow the same shape for parity.

---

## Engine computation (the differentiator)

This is a **layout engine**, not an analysis engine. Correctness = the rendered graph matches what `git log --graph` (or Mermaid) would show for the same operation sequence. Core algorithm:

1. **Replay the operation stream** to build the commit DAG.
   - `commit` → new node, parent = current branch tip; becomes the new tip.
   - `branch X` → new branch pointer at the current tip; switches HEAD to `X` (new lane reserved).
   - `checkout X` / `switch X` → moves HEAD pointer to `X` (no node).
   - `merge X` → new node with **two parents** (current tip + tip of `X`); current branch tip advances to it. (Octopus / >2-parent merges: out of Mermaid scope — see edge cases.)
   - `cherry-pick id: "c"` → new single-parent node on the current branch that *references* source commit `c`.
2. **Lane assignment.** One swimlane per branch, allocated in **order of first appearance**; `main` is lane 0 (`mainBranchOrder: 0`). `order:` on `branch`/`checkout` overrides. **Open design point:** whether to *reuse a freed lane* after a branch's last commit to compact the layout, and the policy for doing so without creating merge-edge crossings (see TODO).
3. **Chronological ordering.** Commits step monotonically along the time axis in source order (a topological order consistent with parent links). `parallelCommits: true` (Mermaid) relaxes strict time-stepping so a commit sits at the same axis position as its parent rather than strictly after.
4. **Merge-edge routing.** Draw the curve from the merged branch's tip into the merge commit (the open/double circle) on the target lane, crossing lanes with a smooth bend; the branch-divergence elbow is the mirror at the fork.
5. **Annotations.** Place branch-name pills at lane heads, commit ids below dots (rotated), tag pills at the tagged commit, and cherry-pick markers on cherry-picked nodes.

**Validation.** No probabilities, no cut sets. Readable errors for: `merge`/`checkout` of an **undeclared branch**; `cherry-pick` of an **unknown id**; **duplicate commit id**; **merge into self** (a branch merging itself); cherry-pick missing the mandatory `parent:` when the source is a merge commit.

---

## DSL sketch (draft — needs Victor; target = Mermaid `gitGraph` parity)

```
gitgraph
  commit id: "init"
  branch develop
  checkout develop
  commit
  commit tag: "v0.1"
  checkout main
  merge develop
  branch feature/login
  commit
  commit type: HIGHLIGHT
  checkout main
  merge feature/login tag: "v1.0"
  cherry-pick id: "init"
```

The intent is **drop-in Mermaid `gitGraph` compatibility** so existing LLM output renders unchanged: same `commit` / `branch` / `checkout` (+ `switch`) / `merge` / `cherry-pick` keywords, same `id:` / `tag:` / `type:` options, optional `gitGraph LR:` / `TB:` / `BT:` orientation, and the `mainBranchName` / `mainBranchOrder` config.

**Mermaid config / theme block (compatibility surface).** Mermaid carries config via a YAML frontmatter or `%%{init}%%` directive. Decide how much of this to honour vs. map to `SchematexTokens`:

```
---
config:
  gitGraph:
    showBranches: true        # draw lane lines + branch labels
    showCommitLabel: true     # draw commit ids
    mainBranchName: 'main'
    mainBranchOrder: 0
    rotateCommitLabel: true   # ~45° commit-id labels
    parallelCommits: false
  theme: 'default'            # base | forest | dark | default | neutral
  themeVariables:
    git0: '#...'  ...  git7: '#...'     # the 8-lane colour cycle
    gitBranchLabel0: '#...' ... gitBranchLabel7: '#...'
    gitInv0: '#...' ... gitInv7: '#...' # inverted/highlight node colours
    commitLabelColor: '#...'
    commitLabelBackground: '#...'
    commitLabelFontSize: '10px'
    tagLabelColor: '#...'
    tagLabelBackground: '#...'
    tagLabelBorder: '#...'
    tagLabelFontSize: '10px'
---
gitGraph
  ...
```

*Draft only.* Open choices: how strictly to mirror Mermaid's config block (parse-and-honour all keys vs. parse-and-ignore the cosmetic ones, mapping colour to our own theme); whether to also accept a more explicit `parent:` form for non-linear histories Mermaid can't cleanly express.

---

## Reference images (visual development targets)

Verified, downloadable reference images to develop the renderer against. All resolve as of 2026-06-03.

1. **Mermaid `gitGraph` canonical render** (rendered live via mermaid.ink from the DSL sketch above — *this is the exact look we must match*).
   - DSL: `gitGraph` with `main` → `develop` (tag `v0.1`) merged back, then `feature` with a `type: HIGHLIGHT` commit merged back with tag `v1.0`.
   - Reproduce the render: paste the DSL into the **Mermaid Live Editor** (https://mermaid.live) or see the rendered examples in the **official gitGraph docs** (https://mermaid.js.org/syntax/gitgraph.html). (mermaid.ink serves the same render from a base64-encoded graph, but the URL is graph-specific and not stable to hardcode here.) *Viewed during research.*
   - **What it shows:** three stacked horizontal swimlanes, top-to-bottom `main` (blue), `develop` (yellow-green), `feature` (green). Each lane has a **colour-matched rounded branch-name pill at its left head**. Branch lines are **thick bars in the lane colour**. Commits are **solid filled circles** in the lane colour; the **merge commits are open/hollow circles** (white centre, coloured ring) sitting on the target lane; the `HIGHLIGHT` commit is a **larger open square outline**. Branch divergence is a coloured **elbow dropping** from `main` down to `develop`/`feature`; each merge is a coloured **curve rising** from the child lane's tip up into the open merge-circle on `main`. Commit ids (`1-0e5ba84`, `2-777235d`, `4-…`, `5-6c51d41`) are printed **below the dots, rotated ~45°**; tags (`v0.1`, `v1.0`) are small **pills above the relevant commit**. Time flows **left → right** (default LR).

2. **GitLab basic branching workflow (Wikimedia Commons, CC BY-SA 4.0).**
   - Page: https://commons.wikimedia.org/wiki/File:Basic_git_branching_workflow_(GitLab).svg
   - Direct SVG: https://upload.wikimedia.org/wikipedia/commons/2/24/Basic_git_branching_workflow_%28GitLab%29.svg
   - 960px PNG: https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Basic_git_branching_workflow_%28GitLab%29.svg/960px-Basic_git_branching_workflow_%28GitLab%29.svg.png — *Downloaded and viewed.*
   - **What it shows:** the **swimlane band** idea made explicit — two bordered horizontal bands labelled **`Main`** and **`Branch`** (vertical text at the far left). Blue commit circles sit on the Main band; a `Develop` circle and a **diamond** (merge-request node) sit on the Branch band. **Green dashed connectors** carry the actions ("Cut branch" dropping from Main to Branch, "Create/update merge request", "More work needed" loop, "Merge to main" rising back up). Confirms the *labelled-swimlane + coloured connector* convention, though it is a conceptual workflow rather than a literal commit DAG.

3. **Git branches merge (Wikimedia Commons, CC BY-SA 4.0).**
   - Page: https://commons.wikimedia.org/wiki/File:Git_branches_merge.svg
   - Direct SVG: https://upload.wikimedia.org/wikipedia/commons/7/77/Git_branches_merge.svg — *Downloaded; resolves (500×200 SVG).*
   - **What it shows:** the minimal fork-and-rejoin shape — a main line, a second line that diverges and then **merges back** into main, with arrowed connectors. The textbook "3-way merge" silhouette Atlassian also teaches.

4. **Atlassian "Using branches" / "git merge" tutorials** (HTML pages with the recognised teaching diagrams; image hotlinks are unstable so cite the pages).
   - https://www.atlassian.com/git/tutorials/using-branches — *verified.*
   - https://www.atlassian.com/git/tutorials/using-branches/git-merge — *verified.* Source for fast-forward vs. 3-way merge visual conventions and feature-branch fork/rejoin shapes.

### Visual conventions our renderer must match

- **One swimlane per branch**, stacked perpendicular to the time axis; `main` (lane 0) is the reference lane. Each lane carries a **colour-matched branch-name label/pill at its head**.
- **Distinct lane colours** cycling through an 8-entry palette (`git0`–`git7`); the branch line, its commit dots, and its name pill all share the lane colour.
- **Commit dots = solid filled circles**; **merge commits = open / double (ring) circles**; **`HIGHLIGHT` = larger open square**; **`REVERSE` = crossed marker**. These four node styles must be visibly distinct.
- **Tags** render as a small pill/flag at the commit; **commit ids** render below the dot, **rotated ~45°** (honour `rotateCommitLabel`), with auto-ids shaped `n-<hash>`.
- **Branch divergence** is a colour-matched **elbow** from parent lane to child lane at the fork; **merge** is a colour-matched **curve** from the merged tip into the open merge-circle on the target lane. Merge curves should cross lanes cleanly without overlapping unrelated dots.
- **Orientation:** default **LR** (time left→right, lanes stacked top-to-bottom); **TB** (time top→bottom, lanes side-by-side) and **BT** (time bottom→top) rotate the whole composition. Branch-label and commit-id placement rotate with it.
- **`showBranches: false`** must drop the lane lines and branch pills (commits-only view); **`showCommitLabel: false`** must drop commit ids.

---

## TODO (Victor — standard research + dev)

- [ ] **Lane-assignment / lane-reuse policy (the core design decision).** Pick the allocation discipline: (a) *never reuse* a lane once a branch ends (simplest, stable, can get wide), vs. (b) *reuse a freed lane* to compact the layout. If reusing, define the rule that avoids merge-edge crossings — e.g. only reuse a lane whose branch has no later merge into/out of it, or run a crossing-count pass and keep the lane order with the fewest crossings. Whatever is chosen must be **deterministic** (golden-string tests). Note Mermaid's own open issues on adjacent-merge line routing and colouring (mermaid-js/mermaid #4912, #4932) — opportunities to do better.
- [ ] **Degree of Mermaid parity vs. Schematex-native extensions.** Decide how strictly to mirror the Mermaid **config / theme block**: honour every `themeVariables` key, or parse-and-map colour to `SchematexTokens` while ignoring cosmetic keys? Document any intentional divergence. Confirm we accept both YAML-frontmatter and `%%{init}%%` config forms, or only one.
- [ ] **Confirm Pro Git ISBN.** Canonical print ISBN-13 appears to be **978-1-4842-0076-6**; the scaffold had 978-1484200773 — reconcile before this doc is cited.
- [ ] Full element rendering: the four commit-node styles (NORMAL dot / REVERSE crossed / HIGHLIGHT open square / merge open-ring), tag pill, cherry-pick marker, branch-label pill placement, lane colour cycle.
- [ ] Orientation: LR default + TB + BT (Mermaid supports all three). Define rotation rules for labels/ids/tags.
- [ ] Validation rules: undeclared branch on checkout/merge, duplicate commit ids, cherry-pick of unknown id, cherry-pick missing `parent:` for a merge source, merge into self.
- [ ] Edge cases: octopus merges (>2 parents — out of Mermaid scope, decide reject vs. extend), interleaved branches, long-lived branches with many commits, re-checkout of an existing branch, `parallelCommits` positioning, detached commits, `showBranches:false` commits-only mode.
- [ ] Cluster placement + `00-OVERVIEW.md` update (developer / software family).
- [ ] 3–5 canonical test cases (linear; feature-branch + merge; Git-Flow with develop+feature+release+hotfix; cherry-pick; orientation TB) with **expected lane assignments** as golden strings.
- [ ] impl doc in `../CoCEO/schematex/impl/`.
