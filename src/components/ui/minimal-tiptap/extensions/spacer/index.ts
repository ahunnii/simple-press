import type { NodeType } from "@tiptap/pm/model";
import { NodeSelection, Selection, TextSelection } from "@tiptap/pm/state";

import type { SpacerSize } from "~/lib/tiptap/spacer-node";
import { coerceSpacerSize, Spacer } from "~/lib/tiptap/spacer-node";

import { findSpacerInsertPos, selectedSpacer } from "./helpers";

export { findSpacerInsertPos, selectedSpacer } from "./helpers";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spacer: {
      /**
       * Insert a spacer after the current block (or just above an empty
       * paragraph), leaving the cursor in a paragraph below it so typing
       * carries on. Allowed inside rows and collapsible sections.
       */
      insertSpacer: (attrs?: { size?: SpacerSize }) => ReturnType;
      /** Resize the node-selected spacer. */
      setSpacerSize: (size: SpacerSize) => ReturnType;
      /** Delete the node-selected spacer. */
      deleteSpacer: () => ReturnType;
    };
  }
}

/** Editors that have had focus at least once (see `insertSpacer`). */
const focusedEditors = new WeakSet<object>();

/**
 * Editor-side `spacer`: the shared schema node plus its insert / resize /
 * remove commands. The node has no node view — the editor CSS draws the
 * dashed outline and the "Space" label on the plain `renderHTML` div.
 */
export const EditorSpacer = Spacer.extend({
  onFocus() {
    focusedEditors.add(this.editor);
  },

  addCommands() {
    return {
      insertSpacer:
        (attrs) =>
        ({ editor, state, tr, dispatch }) => {
          const spacerType: NodeType | undefined = state.schema.nodes.spacer;
          if (!spacerType) return false;

          // An editor that's never been focused has only its default
          // selection (the doc start), so the spacer goes at the end there.
          const pos = findSpacerInsertPos(state, {
            atDocEnd: !focusedEditors.has(editor),
          });
          if (pos === null) return false;
          if (!dispatch) return true;

          const size = coerceSpacerSize(attrs?.size);
          tr.insert(pos, spacerType.create({ size }));

          // Leave the cursor below the new space: in the textblock that
          // follows it, or a fresh paragraph when it closes its container.
          const after = pos + 1;
          const next = tr.doc.resolve(after).nodeAfter;
          if (next?.isTextblock) {
            tr.setSelection(TextSelection.create(tr.doc, after + 1));
          } else if (!next && state.schema.nodes.paragraph) {
            const paragraph = state.schema.nodes.paragraph.create();
            const $after = tr.doc.resolve(after);
            if (
              $after.parent.canReplaceWith(
                $after.index(),
                $after.index(),
                paragraph.type,
              )
            ) {
              tr.insert(after, paragraph);
              tr.setSelection(TextSelection.create(tr.doc, after + 1));
            } else {
              tr.setSelection(NodeSelection.create(tr.doc, pos));
            }
          } else {
            // Followed by a non-text block (image, row…): select the spacer
            // itself, so its size menu shows; Enter opens a line after it.
            tr.setSelection(NodeSelection.create(tr.doc, pos));
          }
          tr.scrollIntoView();
          return true;
        },

      setSpacerSize:
        (sizeInput) =>
        ({ state, tr, dispatch }) => {
          const found = selectedSpacer(state);
          if (!found) return false;
          const size = coerceSpacerSize(sizeInput);
          if (!dispatch) return true;
          if (found.node.attrs.size !== size) {
            // An attr step moves no positions, so the node selection stays.
            tr.setNodeAttribute(found.pos, "size", size);
            tr.setSelection(NodeSelection.create(tr.doc, found.pos));
          }
          return true;
        },

      deleteSpacer:
        () =>
        ({ state, tr, dispatch }) => {
          const found = selectedSpacer(state);
          if (!found) return false;
          if (!dispatch) return true;

          const { node, pos } = found;
          const $pos = tr.doc.resolve(pos);
          const onlyChild = $pos.parent.childCount === 1;
          const paragraph = state.schema.nodes.paragraph?.createAndFill();

          if (onlyChild && paragraph) {
            // Keep the parent valid: a column / collapsible must still hold
            // a block.
            tr.replaceWith(pos, pos + node.nodeSize, paragraph);
            tr.setSelection(TextSelection.create(tr.doc, pos + 1));
          } else {
            tr.delete(pos, pos + node.nodeSize);
            tr.setSelection(
              Selection.near(
                tr.doc.resolve(Math.min(pos, tr.doc.content.size)),
                -1,
              ),
            );
          }
          tr.scrollIntoView();
          return true;
        },
    };
  },
});
