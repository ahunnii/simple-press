import type { NodeType, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import type { ColumnLayout } from "~/lib/tiptap/columns-node";
import {
  coerceColumnLayout,
  columnCountForLayout,
  Columns,
} from "~/lib/tiptap/columns-node";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnsLayout: {
      /**
       * Insert a row of side-by-side columns, each holding an empty
       * paragraph. Refused (so `can()` is false) inside another row.
       */
      insertColumns: (attrs?: { layout?: ColumnLayout }) => ReturnType;
      /**
       * Change the layout of the row the selection is in. Adds empty
       * columns, or folds removed trailing columns' content into the last
       * kept one so nothing is lost.
       */
      setColumnsLayout: (layout: ColumnLayout) => ReturnType;
      /** Delete the row the selection is in, with everything in it. */
      deleteColumns: () => ReturnType;
    };
  }
}

interface FoundColumns {
  node: ProseMirrorNode;
  /** Document position directly before the columns node. */
  pos: number;
}

/** The nearest `columns` ancestor of a resolved position, if any. */
function findColumnsAbove($pos: {
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

/** An empty column holds just one empty paragraph (what `createAndFill` makes). */
function isEmptyColumn(column: ProseMirrorNode): boolean {
  return (
    column.childCount === 1 &&
    column.firstChild !== null &&
    column.firstChild.type.name === "paragraph" &&
    column.firstChild.content.size === 0
  );
}

/** Ancestors whose children must stay put: a row is never inserted inside them. */
const NO_INSERT_PARENTS = new Set(["listItem", "tableCell", "tableHeader"]);

const activeColumnKey = new PluginKey<DecorationSet>("columnsActiveColumn");

/**
 * Editor-side `columns`: the shared schema node plus the insert / re-layout /
 * remove commands and a decoration that marks the column holding the cursor.
 */
export const EditorColumns = Columns.extend({
  addCommands() {
    return {
      insertColumns:
        (attrs) =>
        ({ state, tr, dispatch }) => {
          const { selection, schema } = state;
          const { $from } = selection;

          // Rows never nest.
          if (findColumnsAbove($from)) return false;

          const columnsType: NodeType | undefined = schema.nodes.columns;
          const columnType: NodeType | undefined = schema.nodes.column;
          if (!columnsType || !columnType) return false;

          const layout = coerceColumnLayout(attrs?.layout);
          const columns = Array.from(
            { length: columnCountForLayout(layout) },
            () => columnType.createAndFill(),
          );
          if (columns.some((column) => !column)) return false;
          const node = columnsType.createAndFill(
            { layout },
            columns as ProseMirrorNode[],
          );
          if (!node) return false;

          // Where the row goes: replacing an empty paragraph, otherwise
          // after the current block, climbing out of list items / table cells.
          let from: number;
          let to: number;
          if (selection instanceof NodeSelection) {
            const index = $from.index();
            if (!$from.parent.canReplaceWith(index, index, columnsType)) {
              return false;
            }
            from = to = selection.to;
          } else {
            let found = false;
            from = to = 0;
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
                from = $from.before(depth);
                to = $from.after(depth);
              } else {
                from = to = $from.after(depth);
              }
              found = true;
              break;
            }
            if (!found) return false;
          }

          if (dispatch) {
            tr.replaceWith(from, to, node);
            // columns > column > paragraph: three tokens in.
            tr.setSelection(TextSelection.create(tr.doc, from + 3));
            tr.scrollIntoView();
          }
          return true;
        },

      setColumnsLayout:
        (layoutInput) =>
        ({ state, tr, dispatch }) => {
          const found = findColumnsAbove(state.selection.$from);
          if (!found) return false;

          const layout = coerceColumnLayout(layoutInput);
          const { node, pos } = found;
          const columnType: NodeType | undefined = state.schema.nodes.column;
          if (!columnType) return false;

          const current = node.childCount;
          const target = columnCountForLayout(layout);
          const unchanged = current === target && node.attrs.layout === layout;
          if (unchanged) return true;
          if (!dispatch) return true;

          const selectionFrom = state.selection.from;
          // Layout attr first: it doesn't move any position.
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, layout });

          const contentStart = pos + 1;

          if (target > current) {
            const extra: ProseMirrorNode[] = [];
            for (let i = current; i < target; i++) {
              const column = columnType.createAndFill();
              if (!column) return false;
              extra.push(column);
            }
            tr.insert(
              contentStart + node.content.size,
              Fragment.fromArray(extra),
            );
          } else if (target < current) {
            // Start of the last kept column, in document positions.
            let lastKeptStart = contentStart;
            for (let i = 0; i < target - 1; i++) {
              lastKeptStart += node.child(i).nodeSize;
            }
            const lastKept = node.child(target - 1);
            const lastKeptEnd = lastKeptStart + lastKept.nodeSize;

            // Fold the dropped columns' content onto the last kept column.
            let merged = lastKept.content;
            for (let i = target; i < current; i++) {
              const dropped = node.child(i);
              if (!isEmptyColumn(dropped)) {
                merged = merged.append(dropped.content);
              }
            }
            const mergedColumn = lastKept.type.create(lastKept.attrs, merged);
            tr.replaceWith(
              lastKeptStart,
              contentStart + node.content.size,
              mergedColumn,
            );

            // The replace maps any cursor inside it to its end. A cursor in
            // the last kept column keeps its offset; one in a dropped column
            // lands where that column's content now begins.
            if (selectionFrom >= lastKeptStart) {
              const keep =
                selectionFrom < lastKeptEnd
                  ? selectionFrom
                  : lastKeptStart + 1 + lastKept.content.size;
              tr.setSelection(
                TextSelection.near(
                  tr.doc.resolve(Math.min(keep, tr.doc.content.size)),
                  -1,
                ),
              );
            }
          }
          return true;
        },

      deleteColumns:
        () =>
        ({ state, tr, dispatch }) => {
          const found = findColumnsAbove(state.selection.$from);
          if (!found) return false;
          const { node, pos } = found;
          if (!dispatch) return true;

          const $pos = tr.doc.resolve(pos);
          const onlyChild = $pos.parent.childCount === 1;
          const paragraph = state.schema.nodes.paragraph?.createAndFill();

          if (onlyChild && paragraph) {
            // Keep the parent valid: a column must still hold a block.
            tr.replaceWith(pos, pos + node.nodeSize, paragraph);
            tr.setSelection(TextSelection.create(tr.doc, pos + 1));
          } else {
            tr.delete(pos, pos + node.nodeSize);
            tr.setSelection(
              TextSelection.near(
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

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: activeColumnKey,
        props: {
          // Marks the column holding the cursor so the editor CSS can
          // highlight it (`:focus-within` can't: the whole doc is one
          // contenteditable).
          decorations: (state) => {
            const { $from } = state.selection;
            for (let depth = $from.depth; depth > 0; depth--) {
              if ($from.node(depth).type.name === "column") {
                return DecorationSet.create(state.doc, [
                  Decoration.node($from.before(depth), $from.after(depth), {
                    class: "is-active-column",
                  }),
                ]);
              }
            }
            return DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
