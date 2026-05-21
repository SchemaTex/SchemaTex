/**
 * UML Sequence diagram — layout engine.
 *
 * Spec: docs/reference/33-SEQUENCE-STANDARD.md §5
 *
 * The vertical axis is event order (not real time). Layout is deterministic:
 * a single horizontal pass sizes the lifeline columns (label-aware so messages
 * never collide), then a recursive vertical walk assigns y to every event and
 * frames the combined fragments.
 */

import type {
  SeqActivationBar,
  SeqAst,
  SeqDividerBar,
  SeqFragmentFrame,
  SeqFragmentOperandGeom,
  SeqInvariantBox,
  SeqLayoutResult,
  SeqLifeline,
  SeqMessage,
  SeqMessageRow,
  SeqNote,
  SeqNoteBox,
  SeqRefFrame,
  SeqStatement,
} from "./types";

export const SEQ_CONST = {
  HEAD_W_MIN: 90,
  HEAD_H: 38,
  HEAD_PAD_X: 14,
  LIFELINE_GAP: 140,
  LEFT_MARGIN: 24,
  RIGHT_PAD: 28,
  TOP_PAD: 16,
  HEAD_TO_FIRST: 30,
  EVENT_GAP: 38,
  BOTTOM_PAD: 30,
  SELF_GAP: 30,
  SELF_LOOP_W: 48,
  ACT_W: 10,
  ACT_NEST_DX: 6,
  ACT_STEP: 30,
  FRAG_PAD_X: 10,
  FRAG_LABEL_H: 18,
  FRAG_PAD_TOP: 16,
  FRAG_PAD_BOTTOM: 12,
  FRAG_GAP_BEFORE: 12,
  FRAG_OPERAND_GAP: 18,
  FRAG_NEST_INSET: 8,
  REF_H: 40,
  REF_GAP_BEFORE: 12,
  NOTE_GAP_BEFORE: 10,
  NOTE_PAD: 8,
  NOTE_MIN_W: 70,
  NOTE_LINE_H: 15,
  NOTE_SIDE_GAP: 16,
  DIV_H: 26,
  DIV_GAP_BEFORE: 8,
  INV_GAP_BEFORE: 10,
  INV_PAD: 10,
  INV_H: 24,
  LABEL_GAP_PAD: 26,
  LOST_LEN: 72,
} as const;

const LABEL_SIZE = 11;
const HEAD_TEXT_SIZE = 12.5;

function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) {
    w += /[⺀-￿]/.test(ch) ? size : size * 0.55;
  }
  return w;
}

interface OpenBar {
  x: number;
  yTop: number;
  level: number;
}

interface ColAcc {
  min: number;
  max: number;
}

class SequenceLayout {
  private ast: SeqAst;
  private lifelines: SeqLifeline[] = [];
  private colOf = new Map<string, number>();
  private llById = new Map<string, SeqLifeline>();
  private x: number[] = [];
  private headW: number[] = [];

  private y = 0;
  private open = new Map<string, OpenBar[]>();
  private colAccStack: ColAcc[] = [];

  private messages: SeqMessageRow[] = [];
  private activations: SeqActivationBar[] = [];
  private fragments: SeqFragmentFrame[] = [];
  private refs: SeqRefFrame[] = [];
  private notes: SeqNoteBox[] = [];
  private dividers: SeqDividerBar[] = [];
  private invariants: SeqInvariantBox[] = [];
  private destroys: { x: number; y: number }[] = [];
  private warnings: string[] = [];

  private autoCounter: number | null = null;
  private contentRight = 0;

  constructor(ast: SeqAst) {
    this.ast = ast;
  }

  run(): SeqLayoutResult {
    this.buildColumns();
    if (this.ast.autonumber) this.autoCounter = this.ast.autonumber.start;

    // vertical cursor sits one EVENT_GAP above the first event row
    const headBottom = SEQ_CONST.TOP_PAD + SEQ_CONST.HEAD_H;
    this.y = headBottom + SEQ_CONST.HEAD_TO_FIRST - SEQ_CONST.EVENT_GAP;

    this.walk(this.ast.statements, 0);

    // close any activation bars still open at the end of the interaction
    const bottomY = this.y + SEQ_CONST.EVENT_GAP;
    for (const [id, stack] of this.open) {
      while (stack.length) {
        const b = stack.pop()!;
        this.activations.push({ id, x: b.x, yTop: b.yTop, yBottom: bottomY, level: b.level });
      }
    }

    const bodyBottom = bottomY + SEQ_CONST.BOTTOM_PAD;
    for (const ll of this.lifelines) {
      if (!ll.destroyed) ll.axisBottom = bodyBottom;
    }

    const lastCenter = this.x[this.x.length - 1] ?? SEQ_CONST.LEFT_MARGIN;
    const lastHalf = (this.headW[this.headW.length - 1] ?? SEQ_CONST.HEAD_W_MIN) / 2;
    this.contentRight = Math.max(this.contentRight, lastCenter + lastHalf);
    const width = Math.round(this.contentRight + SEQ_CONST.RIGHT_PAD);
    const height = Math.round(bodyBottom);

    for (const d of this.dividers) d.width = width;

    const result: SeqLayoutResult = {
      width,
      height,
      lifelines: this.lifelines,
      messages: this.messages,
      activations: this.activations,
      fragments: this.fragments,
      refs: this.refs,
      notes: this.notes,
      dividers: this.dividers,
      invariants: this.invariants,
      destroys: this.destroys,
      warnings: this.warnings.concat(this.ast.warnings),
      ast: this.ast,
    };
    if (this.ast.title) result.title = this.ast.title;
    return result;
  }

  // ── horizontal pass ──────────────────────────────────────────

  private buildColumns(): void {
    const ps = this.ast.participants;
    this.headW = ps.map((p) =>
      Math.max(SEQ_CONST.HEAD_W_MIN, Math.ceil(textWidth(p.name, HEAD_TEXT_SIZE)) + SEQ_CONST.HEAD_PAD_X * 2),
    );
    ps.forEach((p, i) => this.colOf.set(p.id, i));

    const n = ps.length;
    const gaps = new Array(Math.max(0, n - 1)).fill(SEQ_CONST.LIFELINE_GAP);
    // head boxes must not overlap
    for (let k = 0; k < gaps.length; k++) {
      gaps[k] = Math.max(gaps[k], this.headW[k]! / 2 + this.headW[k + 1]! / 2 + 28);
    }

    // label-aware widening
    const msgs = collectMessages(this.ast.statements);
    for (const m of msgs) {
      const label = m.label ?? "";
      const w = textWidth(label, LABEL_SIZE) + SEQ_CONST.LABEL_GAP_PAD;
      const cf = this.colOf.get(m.from);
      const ct = this.colOf.get(m.to);
      if (cf === undefined && ct === undefined) continue;
      if (cf === undefined || ct === undefined) continue; // lost/found: width handled later
      if (cf === ct) {
        if (cf < gaps.length) gaps[cf] = Math.max(gaps[cf]!, SEQ_CONST.SELF_LOOP_W + w);
        continue;
      }
      const i = Math.min(cf, ct);
      const j = Math.max(cf, ct);
      if (j === i + 1) {
        gaps[i] = Math.max(gaps[i]!, w);
      } else {
        let span = 0;
        for (let k = i; k < j; k++) span += gaps[k]!;
        if (span < w) {
          const add = (w - span) / (j - i);
          for (let k = i; k < j; k++) gaps[k]! += add;
        }
      }
    }

    this.x = new Array(n);
    let cx = SEQ_CONST.LEFT_MARGIN + (this.headW[0] ?? SEQ_CONST.HEAD_W_MIN) / 2;
    for (let i = 0; i < n; i++) {
      this.x[i] = cx;
      if (i < gaps.length) cx += gaps[i]!;
    }

    ps.forEach((p, i) => {
      const created = p.createdInline === true;
      const headY = created ? -1 : SEQ_CONST.TOP_PAD;
      const ll: SeqLifeline = {
        participant: p,
        index: i,
        x: this.x[i]!,
        headX: this.x[i]! - this.headW[i]! / 2,
        headY,
        headW: this.headW[i]!,
        headH: SEQ_CONST.HEAD_H,
        axisTop: created ? -1 : SEQ_CONST.TOP_PAD + SEQ_CONST.HEAD_H,
        axisBottom: 0,
        destroyed: false,
      };
      this.lifelines.push(ll);
      this.llById.set(p.id, ll);
    });
  }

  // ── column accounting (for fragment extents) ─────────────────

  private touch(col: number | undefined): void {
    if (col === undefined) return;
    for (const acc of this.colAccStack) {
      if (col < acc.min) acc.min = col;
      if (col > acc.max) acc.max = col;
    }
  }

  private noteRight(x: number, w: number): void {
    this.contentRight = Math.max(this.contentRight, x + w);
  }

  // ── activation bars ──────────────────────────────────────────

  private openBar(id: string): void {
    const col = this.colOf.get(id);
    if (col === undefined) return;
    const stack = this.open.get(id) ?? [];
    const level = stack.length;
    const x = this.x[col]! - SEQ_CONST.ACT_W / 2 + level * SEQ_CONST.ACT_NEST_DX;
    stack.push({ x, yTop: this.y, level });
    this.open.set(id, stack);
  }

  private closeBar(id: string): void {
    const stack = this.open.get(id);
    if (!stack || stack.length === 0) {
      this.warnings.push(`deactivate '${id}' with no matching activation`);
      return;
    }
    const b = stack.pop()!;
    this.activations.push({ id, x: b.x, yTop: b.yTop, yBottom: this.y, level: b.level });
  }

  private faceEdge(id: string, col: number, towardRight: boolean, extraLevel = 0): number {
    const stack = this.open.get(id) ?? [];
    const levels = stack.length + extraLevel;
    if (levels <= 0) return this.x[col]!;
    if (!towardRight) return this.x[col]! - SEQ_CONST.ACT_W / 2;
    return this.x[col]! + SEQ_CONST.ACT_W / 2 + (levels - 1) * SEQ_CONST.ACT_NEST_DX;
  }

  // ── vertical walk ────────────────────────────────────────────

  private walk(stmts: SeqStatement[], depth: number): void {
    for (const s of stmts) {
      switch (s.kind) {
        case "message":
          this.placeMessage(s);
          break;
        case "activate":
          this.y += SEQ_CONST.ACT_STEP;
          this.openBar(s.id);
          this.touch(this.colOf.get(s.id));
          break;
        case "deactivate":
          this.y += SEQ_CONST.ACT_STEP;
          this.closeBar(s.id);
          this.touch(this.colOf.get(s.id));
          break;
        case "note":
          this.placeNote(s);
          break;
        case "ref":
          this.placeRef(s.ids, s.text);
          break;
        case "divider":
          this.y += SEQ_CONST.DIV_GAP_BEFORE;
          this.dividers.push({ text: s.text, y: this.y + SEQ_CONST.DIV_H / 2, width: 0 });
          this.y += SEQ_CONST.DIV_H;
          break;
        case "invariant":
          this.placeInvariant(s.id, s.text);
          break;
        case "destroy":
          this.placeDestroy(s.id);
          break;
        case "fragment":
          this.placeFragment(s.op, s.operands, depth, s.messageSet);
          break;
      }
    }
  }

  private nextNumber(): number | undefined {
    if (this.autoCounter === null || !this.ast.autonumber) return undefined;
    const n = this.autoCounter;
    this.autoCounter += this.ast.autonumber.step;
    return n;
  }

  private placeMessage(m: SeqMessage): void {
    this.y += SEQ_CONST.EVENT_GAP;
    const y = this.y;
    const cf = this.colOf.get(m.from);
    const ct = this.colOf.get(m.to);
    const self = m.from !== "" && m.from === m.to;

    let x1: number;
    let x2: number;

    if (m.arrow === "found") {
      // sender outside scope: filled circle to the left of the receiver
      const c = ct!;
      x2 = this.faceEdge(m.to, c, false);
      x1 = x2 - SEQ_CONST.LOST_LEN;
    } else if (m.arrow === "lost") {
      // receiver outside scope: filled circle to the right of the sender
      const c = cf!;
      x1 = this.faceEdge(m.from, c, true);
      x2 = x1 + SEQ_CONST.LOST_LEN;
    } else if (self) {
      const c = cf!;
      x1 = this.faceEdge(m.from, c, true);
      x2 = x1 + SEQ_CONST.SELF_LOOP_W;
    } else {
      const fromRight = (ct ?? 0) > (cf ?? 0);
      x1 = this.faceEdge(m.from, cf!, fromRight);
      if (m.create) {
        // a create arrow terminates on the side of the new participant's head box
        const halfW = this.headW[ct!]! / 2;
        x2 = fromRight ? this.x[ct!]! - halfW : this.x[ct!]! + halfW;
      } else {
        x2 = this.faceEdge(m.to, ct!, !fromRight, m.activateTarget ? 1 : 0);
      }
    }

    const row: SeqMessageRow = { message: m, y, x1, x2, self };
    const num = this.nextNumber();
    if (num !== undefined) row.number = num;
    if (self) {
      row.selfBottomY = y + SEQ_CONST.SELF_GAP;
      this.y = row.selfBottomY;
    }
    this.messages.push(row);
    this.contentRight = Math.max(this.contentRight, x1, x2);
    this.touch(cf);
    this.touch(ct);

    // create: pull the receiver head down to the arrival row
    if (m.create && ct !== undefined) {
      const ll = this.llById.get(m.to)!;
      ll.headY = y - SEQ_CONST.HEAD_H / 2;
      ll.axisTop = ll.headY + SEQ_CONST.HEAD_H;
    }
    // activation side-effects apply at the arrival row
    if (m.activateTarget && ct !== undefined) this.openBar(m.to);
    if (m.deactivateSource && cf !== undefined) this.closeBar(m.from);
  }

  private placeNote(note: SeqNote): void {
    this.y += SEQ_CONST.NOTE_GAP_BEFORE;
    const lines = note.text.split(/<br\s*\/?>|\\n/);
    const textW = lines.reduce((mx, l) => Math.max(mx, textWidth(l, LABEL_SIZE)), 0);
    const w = Math.max(SEQ_CONST.NOTE_MIN_W, Math.ceil(textW) + SEQ_CONST.NOTE_PAD * 2);
    const h = lines.length * SEQ_CONST.NOTE_LINE_H + SEQ_CONST.NOTE_PAD * 2;
    const top = this.y;

    const cols = note.ids.map((id) => this.colOf.get(id)).filter((c): c is number => c !== undefined);
    cols.forEach((c) => this.touch(c));

    let x: number;
    let boxW = w;
    if (note.placement === "over" && cols.length >= 2) {
      const a = this.x[Math.min(...cols)]!;
      const b = this.x[Math.max(...cols)]!;
      const span = b - a + this.headW[Math.min(...cols)]! / 2 + this.headW[Math.max(...cols)]! / 2;
      boxW = Math.max(w, span);
      x = (a + b) / 2 - boxW / 2;
    } else if (note.placement === "left" && cols.length) {
      x = this.x[cols[0]!]! - SEQ_CONST.NOTE_SIDE_GAP - w;
    } else if (note.placement === "right" && cols.length) {
      x = this.x[cols[0]!]! + SEQ_CONST.NOTE_SIDE_GAP;
    } else {
      const c = cols[0] ?? 0;
      x = this.x[c]! - w / 2;
    }

    this.notes.push({ note, x, y: top, width: boxW, height: h });
    this.noteRight(x, boxW);
    this.y = top + h;
  }

  private placeRef(ids: string[], text: string): void {
    this.y += SEQ_CONST.REF_GAP_BEFORE;
    const cols = ids.map((id) => this.colOf.get(id)).filter((c): c is number => c !== undefined);
    cols.forEach((c) => this.touch(c));
    const minC = cols.length ? Math.min(...cols) : 0;
    const maxC = cols.length ? Math.max(...cols) : 0;
    const left = this.x[minC]! - SEQ_CONST.FRAG_PAD_X;
    const right = this.x[maxC]! + SEQ_CONST.FRAG_PAD_X;
    const top = this.y;
    this.refs.push({ text, x: left, y: top, width: right - left, height: SEQ_CONST.REF_H });
    this.noteRight(left, right - left);
    this.y = top + SEQ_CONST.REF_H;
  }

  private placeInvariant(id: string, text: string): void {
    this.y += SEQ_CONST.INV_GAP_BEFORE;
    const col = this.colOf.get(id);
    this.touch(col);
    const w = Math.ceil(textWidth(text, LABEL_SIZE)) + SEQ_CONST.INV_PAD * 2;
    const cx = col !== undefined ? this.x[col]! : SEQ_CONST.LEFT_MARGIN;
    const top = this.y;
    this.invariants.push({ text, cx, y: top, width: w, height: SEQ_CONST.INV_H });
    this.noteRight(cx - w / 2, w);
    this.y = top + SEQ_CONST.INV_H;
  }

  private placeDestroy(id: string): void {
    this.y += SEQ_CONST.EVENT_GAP / 2;
    const ll = this.llById.get(id);
    const col = this.colOf.get(id);
    if (ll && col !== undefined) {
      ll.destroyed = true;
      ll.axisBottom = this.y;
      this.destroys.push({ x: this.x[col]!, y: this.y });
      this.touch(col);
    }
  }

  private placeFragment(
    op: SeqFragmentFrame["op"],
    operands: { guard?: string; statements: SeqStatement[] }[],
    depth: number,
    messageSet?: string[],
  ): void {
    const frameTop = this.y + SEQ_CONST.FRAG_GAP_BEFORE;
    const acc: ColAcc = { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
    this.colAccStack.push(acc);

    const operandGeom: SeqFragmentOperandGeom[] = [];

    // first operand
    this.y = frameTop + SEQ_CONST.FRAG_LABEL_H + SEQ_CONST.FRAG_PAD_TOP - SEQ_CONST.EVENT_GAP;
    const firstGeom: SeqFragmentOperandGeom = {};
    if (operands[0]?.guard) firstGeom.guard = operands[0].guard;
    operandGeom.push(firstGeom);
    this.walk(operands[0]?.statements ?? [], depth + 1);

    // subsequent operands (else / and)
    for (let oi = 1; oi < operands.length; oi++) {
      const sepY = this.y + SEQ_CONST.FRAG_OPERAND_GAP;
      const geom: SeqFragmentOperandGeom = { sepY };
      if (operands[oi]!.guard) geom.guard = operands[oi]!.guard;
      operandGeom.push(geom);
      this.y = sepY + SEQ_CONST.FRAG_PAD_TOP - SEQ_CONST.EVENT_GAP;
      this.walk(operands[oi]!.statements, depth + 1);
    }

    const frameBottom = this.y + SEQ_CONST.FRAG_PAD_BOTTOM;
    this.colAccStack.pop();

    // resolve horizontal extent from covered columns, with depth-based inset so
    // nested frames sit strictly inside their parent.
    let minC = acc.min;
    let maxC = acc.max;
    if (!isFinite(minC)) {
      minC = 0;
      maxC = Math.max(0, this.lifelines.length - 1);
    }
    const inset = depth * SEQ_CONST.FRAG_NEST_INSET;
    let left = this.x[minC]! - SEQ_CONST.FRAG_PAD_X + inset;
    let right = this.x[maxC]! + SEQ_CONST.FRAG_PAD_X - inset;
    if (right - left < 40) {
      // keep a sane minimum width
      const mid = (left + right) / 2;
      left = mid - 20;
      right = mid + 20;
    }

    const frame: SeqFragmentFrame = {
      op,
      x: left,
      y: frameTop,
      width: right - left,
      height: frameBottom - frameTop,
      operands: operandGeom,
    };
    if (messageSet && messageSet.length) frame.messageSet = messageSet;
    this.fragments.push(frame);
    this.noteRight(left, right - left);
    this.y = frameBottom;
  }
}

/** Recursively flatten messages in document order (for the horizontal sizing pass). */
function collectMessages(stmts: SeqStatement[]): SeqMessage[] {
  const out: SeqMessage[] = [];
  for (const s of stmts) {
    if (s.kind === "message") out.push(s);
    else if (s.kind === "fragment") {
      for (const op of s.operands) out.push(...collectMessages(op.statements));
    }
  }
  return out;
}

export function layoutSequence(ast: SeqAst): SeqLayoutResult {
  return new SequenceLayout(ast).run();
}
