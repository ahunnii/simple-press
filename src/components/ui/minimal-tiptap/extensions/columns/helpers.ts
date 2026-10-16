import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { AllSelection, NodeSelection } from "@tiptap/pm/state";

/**
 * Pure (DOM-free) helpers behind the editor's `columns` commands and
 * bubble menu, kept apart so they can be unit-tested on a bare
 * `EditorState`.
 */

export interface FoundColumns {
  node: ProseMirrorNode;
  /** Document position directly before the columns node. */
  pos: number;
}

/** The nearest `columns` ancestor of a resolved position, if any. */
export function findColumnsAbove($pos: {
  depth: number;
  node: (depth: number) => ProseMirrorNode;
  before: (depth: number) => number;
}): FoundColumns | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === "columns") {
      return { node, pos: $pos.before(depth) };
    }
  }
  return null;
}

/** Ancestors whose children must stay put: a row is never inserted inside them. */
const NO_INSERT_PARENTS = new Set(["listItem", "tableCell", "tableHeader"]);

export interface InsertRange {
  from: number;
  to: number;
}

/**
 * Where `insertColumns` puts a new row, or `null` when a row can't go in
 * (the selection is inside a row — rows never nest — or no ancestor accepts
 * one). `from === to` is a plain insert; otherwise the range is an empty
 * paragraph the row replaces.
 *
 *  - `atDocEnd` (an editor that has never been focused, so its selection
 *    is just the default one at the doc start, not a place the owner put
 *    the cursor) and `AllSelection` (Cmd+A; also the default selection of a
 *    childless doc): at the end of the doc, replacing a trailing empty
 *    paragraph. Never replaces selected content.
 *  - Inside a block: replaces an empty paragraph, otherwise goes after the
 *    current block, climbing out of list items / table cells.
 *  - Node selection (an image, gallery…): directly after the node.
 *  - Gap cursor between two top-level blocks: at the gap cursor.
 */
export function findColumnsInsertRange(
  state: EditorState,
  { atDocEnd = false }: { atDocEnd?: boolean } = {},
): InsertRange | null {
  const { selection, schema, doc } = state;
  const columnsType = schema.nodes.columns;
  if (!columnsType) return null;
  const { $from } = selection;

  if (atDocEnd || selection instanceof AllSelection) {
    const end = doc.content.size;
    const last = doc.lastChild;
    if (
      last?.type.name === "paragraph" &&
      last.content.size === 0 &&
      doc.canReplaceWith(doc.childCount - 1, doc.childCount, columnsType)
    ) {
      return { from: end - last.nodeSize, to: end };
    }
    return doc.canReplaceWith(doc.childCount, doc.childCount, columnsType)
      ? { from: end, to: end }
      : null;
  }

  // Rows never nest.
  if (findColumnsAbove($from)) return null;

  if (selection instanceof NodeSelection) {
    const index = $from.index();
    if (!$from.parent.canReplaceWith(index, index, columnsType)) return null;
    return { from: selection.to, to: selection.to };
  }

  // A cursor sitting between blocks at the top level (gap cursor).
  if ($from.depth === 0) {
    const index = $from.index(0);
    return doc.canReplaceWith(index, index, columnsType)
      ? { from: $from.pos, to: $from.pos }
      : null;
  }

  for (let depth = $from.depth; depth > 0; depth--) {
    const parent = $from.node(depth - 1);
    if (NO_INSERT_PARENTS.has(parent.type.name)) continue;
    const index = $from.index(depth - 1);
    if (!parent.canReplaceWith(index, index, columnsType)) continue;
    const block = $from.node(depth);
    if (
      depth === $from.depth &&
      block.type.name === "paragraph" &&
      block.content.size === 0
    ) {
      return { from: $from.before(depth), to: $from.after(depth) };
    }
    const after = $from.after(depth);
    return { from: after, to: after };
  }
  return null;
}
