/**
 * UML Sequence diagram — AST and layout types.
 *
 * Spec: docs/reference/33-SEQUENCE-STANDARD.md
 */

// ─── AST ─────────────────────────────────────────────────────────

/** Lifeline head kind (UML 2.5.1 §17.3 classifier stereotypes). */
export type SeqParticipantKind =
  | "participant"
  | "actor"
  | "boundary"
  | "control"
  | "entity"
  | "database"
  | "collections"
  | "queue";

export interface SeqParticipant {
  id: string;
  name: string;
  kind: SeqParticipantKind;
  /** Custom classifier stereotype, e.g. «system» / «service». Overrides the kind label. */
  stereotype?: string;
  /** Instantiated mid-interaction via a `create` message — head drawn lower. */
  createdInline?: boolean;
  /** Declaration / first-use line, for error messages. */
  line?: number;
}

/**
 * Message arrow semantics (UML 2.5.1 §17.4):
 *  - sync:  blocking call    — solid line, filled triangle head
 *  - async: signal           — solid line, open (thin) head
 *  - reply: return           — dashed line, open head
 *  - lost:  unknown receiver — line ends at a filled circle
 *  - found: unknown sender   — line starts at a filled circle
 */
export type SeqArrowKind = "sync" | "async" | "reply" | "lost" | "found";

export interface SeqMessage {
  kind: "message";
  /** Sender id. Empty string for a `found` message (sender outside scope). */
  from: string;
  /** Receiver id. Empty string for a `lost` message (receiver outside scope). */
  to: string;
  arrow: SeqArrowKind;
  label?: string;
  /** `+` suffix — activate the receiver on arrival. */
  activateTarget?: boolean;
  /** `-` suffix — deactivate the sender after this message is sent. */
  deactivateSource?: boolean;
  /** `*Target` form — this message instantiates the receiver. */
  create?: boolean;
  line?: number;
}

export interface SeqActivation {
  kind: "activate" | "deactivate";
  id: string;
  line?: number;
}

export type SeqNotePlacement = "over" | "left" | "right";

export interface SeqNote {
  kind: "note";
  placement: SeqNotePlacement;
  /** One id for over/left/right; two ids for a spanning `over A, B` note. */
  ids: string[];
  text: string;
  line?: number;
}

/** Combined-fragment operators — the full UML `InteractionOperatorKind` set. */
export type SeqFragmentOp =
  | "alt"
  | "opt"
  | "loop"
  | "par"
  | "break"
  | "critical"
  | "seq"
  | "strict"
  | "neg"
  | "ignore"
  | "consider"
  | "assert";

export interface SeqOperand {
  /** Guard `[…]` (alt/opt/loop/break) or operand label (par/seq/strict `and`). */
  guard?: string;
  statements: SeqStatement[];
}

export interface SeqFragment {
  kind: "fragment";
  op: SeqFragmentOp;
  operands: SeqOperand[];
  /** Message-name set for `ignore`/`consider` (the `{m1, m2}` clause). */
  messageSet?: string[];
  line?: number;
}

export interface SeqRef {
  kind: "ref";
  ids: string[];
  text: string;
  line?: number;
}

export interface SeqDivider {
  kind: "divider";
  text: string;
  line?: number;
}

export interface SeqInvariant {
  kind: "invariant";
  id: string;
  text: string;
  line?: number;
}

export interface SeqDestroy {
  kind: "destroy";
  id: string;
  line?: number;
}

export type SeqStatement =
  | SeqMessage
  | SeqActivation
  | SeqNote
  | SeqFragment
  | SeqRef
  | SeqDivider
  | SeqInvariant
  | SeqDestroy;

export interface SeqAst {
  type: "sequence";
  title?: string;
  participants: SeqParticipant[];
  statements: SeqStatement[];
  /** Present iff `autonumber` was declared. */
  autonumber?: { start: number; step: number };
  warnings: string[];
}

// ─── Layout result ───────────────────────────────────────────────

export interface SeqLifeline {
  participant: SeqParticipant;
  index: number;
  /** Center x of the lifeline axis. */
  x: number;
  headX: number;
  headY: number;
  headW: number;
  headH: number;
  /** y where the dashed time-axis begins (head bottom). */
  axisTop: number;
  /** y where it ends (destroy y, or diagram bottom). */
  axisBottom: number;
  destroyed: boolean;
}

export interface SeqMessageRow {
  message: SeqMessage;
  /** Autonumber sequence number, when enabled. */
  number?: number;
  y: number;
  /** Start / end x of the arrow (already attached to activation-bar edges). */
  x1: number;
  x2: number;
  self: boolean;
  /** For self messages: the bottom y of the bent loop. */
  selfBottomY?: number;
}

export interface SeqActivationBar {
  id: string;
  x: number;
  yTop: number;
  yBottom: number;
  level: number;
}

export interface SeqFragmentOperandGeom {
  guard?: string;
  /** Separator y for operands after the first (undefined for the first operand). */
  sepY?: number;
}

export interface SeqFragmentFrame {
  op: SeqFragmentOp;
  x: number;
  y: number;
  width: number;
  height: number;
  operands: SeqFragmentOperandGeom[];
  /** Message-name set for `ignore`/`consider`, shown in the operator tag. */
  messageSet?: string[];
}

export interface SeqRefFrame {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeqNoteBox {
  note: SeqNote;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeqDividerBar {
  text: string;
  y: number;
  width: number;
}

export interface SeqInvariantBox {
  text: string;
  /** Center x (sits on the lifeline axis). */
  cx: number;
  y: number;
  width: number;
  height: number;
}

export interface SeqDestroyMark {
  x: number;
  y: number;
}

export interface SeqLayoutResult {
  width: number;
  height: number;
  title?: string;
  lifelines: SeqLifeline[];
  messages: SeqMessageRow[];
  activations: SeqActivationBar[];
  fragments: SeqFragmentFrame[];
  refs: SeqRefFrame[];
  notes: SeqNoteBox[];
  dividers: SeqDividerBar[];
  invariants: SeqInvariantBox[];
  destroys: SeqDestroyMark[];
  warnings: string[];
  ast: SeqAst;
}
