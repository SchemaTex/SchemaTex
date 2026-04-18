import type { BlockAST } from "../../core/types";
import { layoutBlockDiagram } from "./layout";
import {
  svgRoot,
  defs,
  group,
  el,
  circle,
  path as pathEl,
  text,
  title as titleEl,
  desc,
} from "../../core/svg";

const ROLE_FILL: Record<string, string> = {
  plant: "#ffffff",
  controller: "#E3F2FD",
  sensor: "#F3E5F5",
  actuator: "#E8F5E9",
  filter: "#FFF8E1",
  reference: "#ffffff",
  disturbance: "#FFF3E0",
  generic: "#ffffff",
};

export function renderBlockDiagram(ast: BlockAST): string {
  const layout = layoutBlockDiagram(ast);
  const titleOffset = ast.title ? 26 : 0;
  const { width } = layout;
  const height = layout.height + titleOffset;

  const css = `
.schematex-bd { background: #fff; font-family: system-ui, -apple-system, sans-serif; }
.schematex-bd-block { stroke: #333; stroke-width: 2; }
.schematex-bd-tf { font: italic 14px serif; fill: #111; }
.schematex-bd-block-name { font: 10px sans-serif; fill: #666; }
.schematex-bd-sum { fill: #fff; stroke: #333; stroke-width: 2; }
.schematex-bd-sum-sign { font: bold 11px sans-serif; fill: #333; }
.schematex-bd-signal { stroke: #333; stroke-width: 2; fill: none; }
.schematex-bd-signal-discrete { stroke: #333; stroke-width: 2; fill: none; stroke-dasharray: 6 4; }
.schematex-bd-signal-label { font: italic 12px serif; fill: #333; }
.schematex-bd-port-label { font: italic 13px serif; fill: #111; }
.schematex-bd-title { font: bold 15px sans-serif; fill: #111; }
.schematex-bd-branch { fill: #333; stroke: none; }
`.trim();

  const arrowDef = el(
    "marker",
    {
      id: "lt-bd-arrow",
      markerWidth: 10,
      markerHeight: 8,
      refX: 9,
      refY: 4,
      orient: "auto",
    },
    [el("polygon", { points: "0 0, 10 4, 0 8", fill: "#333" })]
  );

  const nodeSvgs: string[] = [];
  const edgeSvgs: string[] = [];
  const branchSvgs: string[] = [];

  for (const n of layout.nodes) {
    if (n.kind === "block") {
      const fill = ROLE_FILL[n.role] ?? "#fff";
      nodeSvgs.push(
        group(
          {
            transform: `translate(${n.x}, ${n.y})`,
            "data-block-id": n.id,
            "data-block-role": n.role,
          },
          [
            el("rect", {
              width: n.width,
              height: n.height,
              fill,
              class: "schematex-bd-block",
              rx: 2,
            }),
            text(
              {
                x: n.width / 2,
                y: n.height / 2 + 5,
                "text-anchor": "middle",
                class: "schematex-bd-tf",
              },
              n.label
            ),
          ]
        )
      );
      if (n.hasBranch) {
        branchSvgs.push(
          circle({
            cx: n.x + n.width,
            cy: n.y + n.height / 2,
            r: 3.5,
            class: "schematex-bd-branch",
          })
        );
      }
    } else if (n.kind === "sum") {
      nodeSvgs.push(
        group({ "data-sum-id": n.id }, [
          circle({
            cx: n.cx,
            cy: n.cy,
            r: n.r,
            class: "schematex-bd-sum",
          }),
        ])
      );
      if (n.hasBranch) {
        branchSvgs.push(
          circle({
            cx: n.cx + n.r,
            cy: n.cy,
            r: 3.5,
            class: "schematex-bd-branch",
          })
        );
      }
    } else if (n.kind === "port") {
      nodeSvgs.push(
        group({ "data-port-id": n.id }, [
          text(
            {
              x: n.isInput ? n.x - 4 : n.x + 4,
              y: n.y + 4,
              "text-anchor": n.isInput ? "end" : "start",
              class: "schematex-bd-port-label",
            },
            n.label
          ),
        ])
      );
    }
  }

  for (const e of layout.edges) {
    const cls = e.discrete
      ? "schematex-bd-signal-discrete"
      : "schematex-bd-signal";
    edgeSvgs.push(
      pathEl({
        d: e.path,
        class: cls,
        "marker-end": "url(#lt-bd-arrow)",
        "data-from": e.from,
        "data-to": e.to,
      })
    );
    if (e.label) {
      edgeSvgs.push(
        text(
          {
            x: e.midX,
            y: e.midY,
            "text-anchor": "middle",
            class: "schematex-bd-signal-label",
          },
          e.label
        )
      );
    }
    if (e.polarity) {
      edgeSvgs.push(
        text(
          {
            x: e.polarity.x,
            y: e.polarity.y,
            "text-anchor": "middle",
            class: "schematex-bd-sum-sign",
          },
          e.polarity.sign === "-" ? "−" : "+"
        )
      );
    }
  }

  const titleSvg = ast.title
    ? text(
        {
          x: width / 2,
          y: 18,
          "text-anchor": "middle",
          class: "schematex-bd-title",
        },
        ast.title
      )
    : "";

  return svgRoot(
    {
      class: "schematex-bd",
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: "img",
      "data-diagram-type": "blockdiagram",
    },
    [
      titleEl(ast.title ?? "Block Diagram"),
      desc(
        `Block diagram with ${ast.blocks.length} blocks, ${ast.sums.length} summing junctions, ${ast.connections.length} signals`
      ),
      defs([el("style", {}, css), arrowDef]),
      titleSvg,
      group({ transform: `translate(0, ${titleOffset})` }, [
        group({ class: "schematex-bd-signals" }, edgeSvgs),
        group({ class: "schematex-bd-nodes" }, nodeSvgs),
        group({ class: "schematex-bd-branches" }, branchSvgs),
      ]),
    ]
  );
}
