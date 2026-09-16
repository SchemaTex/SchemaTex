A Git Flow release history for a web shop, drawn as a vertical git branch graph with the newest commit at the top. `main` is tagged v2.3.0. `develop` branches from it, and a `feature/saved-carts` branch grows off develop. A `hotfix/2.3.1` branch fixes a refund bug and is merged into main as v2.3.1 and back into develop. The feature is then merged, and `release/2.4` is cut, polished, merged into main as v2.4.0 and back into develop. Branch graphs have no formal standard. This variant follows the convention of the tools developers read history in every day: `git log --graph --decorate`, GitKraken, Sourcetree, the VS Code Git Graph extension and the JetBrains IDE Git log. The marker shapes and tag pills are the ones GitGraph.js and Mermaid `gitGraph` use.

Why it works as the exemplar for this variant:

- There is one row per commit, newest at the top, so every commit message sits horizontally in its own row, right of the graph, and never crosses a line. Faint alternating row bands tie each message back to its dot.
- Each branch has its own vertical lane and colour, and the branch's line, commits and name pill all share that colour. Lanes run from long-lived to short-lived, left to right: main, hotfix, release, develop, feature.
- A fork leaves its parent commit with a short curve into the new lane. A merge runs up its own lane and curves into the merge commit on the target lane, in the colour of the branch being merged. Lines pass only through their own commits.
- Marker shape carries meaning: a filled dot is an ordinary commit, a hollow ring is a merge commit, and a filled square is a highlighted commit. Branch names are filled pills after the message of the branch's tip commit. Tags are white outlined pills with a small tag hole.
- Merge commit messages are grey so the authored commits read first. A legend repeats the five marks.

Palette: ink #0F172A, muted #475569, faint #64748B, rule #94A3B8, row band #F8FAFC, paper #FFFFFF; lanes main #2563EB, hotfix #DC2626, release #7C3AED, develop #D97706, feature #059669; tag outline #334155.

Reference: Git documentation, *git-log* `--graph`, https://git-scm.com/docs/git-log ; VS Code Git Graph extension, https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph ; JetBrains, *Investigate changes in Git repository* (Log tab), https://www.jetbrains.com/help/idea/log-tab.html ; GitKraken and Sourcetree commit graphs ; Driessen, *A successful Git branching model*, https://nvie.com/posts/a-successful-git-branching-model/
