import type { EditorState } from "@tiptap/pm/state";
import { AllSelection, NodeSelection } from "@tiptap/pm/state";

/**
 * Pure (DOM-free) helpers behind the editor's `spacer` commands, kept apart
 * so they can be unit-tested on a bare `EditorState`.
 */

/** Ancestors whose children must stay put: a spacer goes after them instead. */
const NO_INSERT_PARENTS = new Set(["listItem", "tableCell", "tableHeader"]);

/**
 * Where `insertSpacer` puts a new spacer (a document position between two
 * blocks), or `null` when no ancestor accepts one. Same placement rules as a
 * new columns row, except a spacer may go inside a row or a collapsible, and
 * it never replaces anything:
 *
 *  - `atDocEnd` (an editor that has never been focused, so its selection is
 *    just the default one at the doc start) and `AllSelection` (Cmd+A): at
 *    the end of the doc, before a trailing empty paragraph if there is one.
 *  - Inside an empty paragraph: just before it, so the cursor stays in that
 *    paragraph, below the new space.
 *  - Inside any other block: after it, climbing out of list items / table
 *    cells.
 *  - Node selection (an image, another spacer…): directly after the node.
 *  - Gap cursor between two blocks: at the gap cursor.
 */
export function findSpacerInsertPos(
  state: EditorState,
  { atDocEnd = false }: { atDocEnd?: boolean } = {},
): number | null {
  const { selection, schema, doc } = state;
  const spacerType = schema.nodes.spacer;
  if (!spacerType) return null;
  const { $from } = selection;

  if (atDocEnd || selection instanceof AllSelection) {
    const last = doc.lastChild;
    if (last?.type.name === "paragraph" && last.content.size === 0) {
      const index = doc.childCount - 1;
      return doc.canReplaceWith(index, index, spacerType)
        ? doc.content.size - last.nodeSize
        : null;
    }
    return doc.canReplaceWith(doc.childCount, doc.childCount, spacerType)
      ? doc.content.size
      : null;
  }

  // A node-selected block (an inline node falls through to "after its
  // paragraph" below).
  if (selection instanceof NodeSelection) {
    const index = $from.index() + 1;
    if ($from.parent.canReplaceWith(index, index, spacerType)) {
      return selection.to;
    }
  } else if (!$from.parent.isTextblock) {
    // A cursor sitting between blocks (gap cursor), at any depth.
    const index = $from.index();
    if ($from.parent.canReplaceWith(index, index, spacerType)) {
      return $from.pos;
    }
  }

  for (let depth = $from.depth; depth > 0; depth--) {
    const parent = $from.node(depth - 1);
    if (NO_INSERT_PARENTS.has(parent.type.name)) continue;
    const index = $from.index(depth - 1);
    if (!parent.canReplaceWith(index, index, spacerType)) continue;
    const block = $from.node(depth);
    if (
      depth === $from.depth &&
      block.type.name === "paragraph" &&
      block.content.size === 0
    ) {
      return $from.before(depth);
    }
    return $from.after(depth);
  }
  return null;
}

/** The node-selected spacer and its position, if the selection is one. */
export function selectedSpacer(state: EditorState) {
  const { selection } = state;
  return selection instanceof NodeSelection &&
    selection.node.type.name === "spacer"
    ? { node: selection.node, pos: selection.from }
    : null;
}
