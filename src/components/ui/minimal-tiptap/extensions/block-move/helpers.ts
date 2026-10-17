import type {
  Node as ProseMirrorNode,
  ResolvedPos,
  Slice,
} from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { NodeSelection, Selection, TextSelection } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";

/**
 * Pure (DOM-free) helpers behind the block side menu (grip + plus) and the
 * Alt+↑/↓ shortcuts, kept apart so they can be unit-tested on a bare
 * `EditorState`.
 *
 * A "block" here is a direct child of one of the BLOCK_CONTAINERS: the doc,
 * a `column`, or a collapsible's `detailsContent`. So a paragraph inside a
 * column is its own block, but a paragraph inside a list item, quote or table
 * cell is not: the whole list / quote / table is the block. Moves swap with
 * the previous/next sibling in the same container and never leave it.
 */

/** Node types whose children are the movable blocks. */
export const BLOCK_CONTAINERS: ReadonlySet<string> = new Set([
  "doc",
  "column",
  "detailsContent",
]);

export function isBlockContainer(node: ProseMirrorNode | null | undefined) {
  return !!node && BLOCK_CONTAINERS.has(node.type.name);
}

export interface FoundBlock {
  node: ProseMirrorNode;
  /** Document position directly before the block. */
  pos: number;
}

/** The block starting at `pos`, or `null` if `pos` isn't a block start. */
export function blockAt(doc: ProseMirrorNode, pos: number): FoundBlock | null {
  if (pos < 0 || pos >= doc.content.size) return null;
  const node = doc.nodeAt(pos);
  if (!node?.isBlock) return null;
  if (!isBlockContainer(doc.resolve(pos).parent)) return null;
  return { node, pos };
}

/** The innermost block (direct child of a container) around `$pos`. */
export function blockAroundResolved($pos: ResolvedPos): FoundBlock | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    if (isBlockContainer($pos.node(depth - 1))) {
      return { node: $pos.node(depth), pos: $pos.before(depth) };
    }
  }
  return null;
}

/**
 * The block the selection is in (what Alt+↑/↓ moves): the innermost
 * ancestor of the selection start that is a direct child of the doc, a
 * column or a collapsible. A selected node that is itself such a child
 * (an image in a column) is the block. A gap cursor sitting between blocks
 * has no block.
 */
export function selectedBlock(selection: Selection): FoundBlock | null {
  const { $from } = selection;
  if (selection instanceof NodeSelection) {
    if (isBlockContainer($from.parent)) {
      return { node: selection.node, pos: selection.from };
    }
    return blockAroundResolved($from);
  }
  // A cursor directly in a container (gap cursor) isn't inside any block.
  if (isBlockContainer($from.parent)) return null;
  return blockAroundResolved($from);
}

/** `index` of the block in its container and the container's child count. */
export function blockSiblings(
  doc: ProseMirrorNode,
  pos: number,
): { index: number; count: number } | null {
  if (!blockAt(doc, pos)) return null;
  const $pos = doc.resolve(pos);
  return { index: $pos.index(), count: $pos.parent.childCount };
}

/**
 * Swap the block with its previous (`-1`) or next (`1`) sibling in the same
 * container. Returns the block's new position, or `null` at the edge.
 *
 * The SIBLING is the node that gets deleted and re-inserted, so the moved
 * block itself is never touched: a cursor, node selection or cell selection
 * inside it maps straight through to its new spot.
 */
export function moveBlock(
  tr: Transaction,
  block: FoundBlock,
  dir: -1 | 1,
): number | null {
  const $pos = tr.doc.resolve(block.pos);
  const parent = $pos.parent;
  const index = $pos.index();
  const end = block.pos + block.node.nodeSize;

  if (dir === -1) {
    if (index === 0) return null;
    const prev = parent.child(index - 1);
    const prevPos = block.pos - prev.nodeSize;
    tr.delete(prevPos, block.pos);
    tr.insert(tr.mapping.map(end), prev);
    return prevPos;
  }

  if (index >= parent.childCount - 1) return null;
  const next = parent.child(index + 1);
  tr.delete(end, end + next.nodeSize);
  tr.insert(block.pos, next);
  return block.pos + next.nodeSize;
}

/** Insert a copy of the block right after it. Returns the copy's position. */
export function duplicateBlock(tr: Transaction, block: FoundBlock): number {
  const end = block.pos + block.node.nodeSize;
  tr.insert(end, block.node);
  return end;
}

/**
 * Delete the block. A container may never be empty (`block+`), so its only
 * block is swapped for an empty paragraph instead. Returns `false` when
 * there's nothing to do (the only block is already an empty paragraph).
 */
export function deleteBlock(tr: Transaction, block: FoundBlock): boolean {
  const $pos = tr.doc.resolve(block.pos);
  const end = block.pos + block.node.nodeSize;
  if ($pos.parent.childCount > 1) {
    tr.delete(block.pos, end);
    return true;
  }
  const paragraph = tr.doc.type.schema.nodes.paragraph;
  if (!paragraph) return false;
  if (block.node.type === paragraph && block.node.content.size === 0) {
    return false;
  }
  tr.replaceWith(block.pos, end, paragraph.create());
  return true;
}

/**
 * Give the block an empty line right after it, in the same container (so
 * inside the column / collapsible when the block is nested), and put the
 * cursor in it. Returns the cursor position.
 *
 * When the next sibling already IS an empty paragraph — typically the
 * padding line ContainerTrailingParagraph (columns / collapsibles) or
 * TrailingNode (the page) keeps after an image — that line is reused rather
 * than stacking a second empty one above it.
 */
export function insertParagraphAfter(
  tr: Transaction,
  block: FoundBlock,
): number | null {
  const paragraph = tr.doc.type.schema.nodes.paragraph;
  if (!paragraph) return null;
  const end = block.pos + block.node.nodeSize;
  const next = tr.doc.resolve(end).nodeAfter;
  if (next?.type === paragraph && next.content.size === 0) {
    tr.setSelection(TextSelection.create(tr.doc, end + 1));
    return end + 1;
  }
  tr.insert(end, paragraph.create());
  tr.setSelection(TextSelection.create(tr.doc, end + 1));
  return end + 1;
}

/** Whether a slice holds a `columns` row anywhere inside it. */
export function sliceHasColumns(slice: Slice): boolean {
  let found = false;
  slice.content.descendants((node) => {
    if (found) return false;
    if (node.type.name === "columns") found = true;
    return !found;
  });
  return found;
}

/**
 * Whether dropping `slice` at document position `pos` (the mouse position,
 * before ProseMirror's own `dropPoint` adjustment, which this repeats) would
 * put a column row inside another row. Rows never nest — the same rule
 * `insertColumns` enforces — and the schema alone doesn't stop it (`column`
 * is `block+` and `columns` is in the block group).
 */
export function dropWouldNestRow(
  doc: ProseMirrorNode,
  pos: number,
  slice: Slice,
): boolean {
  if (!sliceHasColumns(slice)) return false;
  const target = dropPoint(doc, pos, slice) ?? pos;
  const $target = doc.resolve(target);
  for (let depth = $target.depth; depth > 0; depth--) {
    const name = $target.node(depth).type.name;
    if (name === "columns" || name === "column") return true;
  }
  return false;
}

/**
 * After a drop: ProseMirror leaves a NodeSelection on the dropped node. For
 * anything but an atom (a paragraph, heading, list, row…) the next keystroke
 * would replace the whole block, so this returns a transaction moving the
 * cursor to the end of it instead (`null` when nothing needs to change).
 * Atoms (images, galleries…) keep their node selection.
 */
export function caretAfterDroppedBlock(state: EditorState): Transaction | null {
  const { selection } = state;
  if (!(selection instanceof NodeSelection) || selection.node.isAtom) {
    return null;
  }
  return state.tr.setSelection(
    Selection.near(state.doc.resolve(selection.to - 1), -1),
  );
}
