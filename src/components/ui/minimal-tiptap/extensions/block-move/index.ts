import type { Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import type { FoundBlock } from "./helpers";

import {
  blockAt,
  caretAfterDroppedBlock,
  deleteBlock,
  dropWouldNestRow,
  duplicateBlock,
  insertParagraphAfter,
  moveBlock,
  selectedBlock,
} from "./helpers";
import {
  attachNodeViewDrop,
  DROP_REFUSED_CLASS,
  dropHost,
} from "./node-view-drop";

export * from "./helpers";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockMove: {
      /**
       * Swap a block with the one above it, inside the same container (the
       * page, a column, or a collapsible). `pos` is the position directly
       * before the block (what the side menu tracks); without it, the block
       * holding the selection. Refused at the top of its container.
       */
      moveBlockUp: (pos?: number) => ReturnType;
      /** Like `moveBlockUp`, downwards. */
      moveBlockDown: (pos?: number) => ReturnType;
      /** Insert a copy of the block right after it. */
      duplicateBlock: (pos?: number) => ReturnType;
      /** Delete the block (a container's only block becomes an empty line). */
      deleteBlock: (pos?: number) => ReturnType;
      /**
       * Add an empty paragraph right after the block, in the same container,
       * and put the cursor in it.
       */
      insertParagraphAfterBlock: (pos?: number) => ReturnType;
    };
  }
}

function targetBlock(tr: Transaction, pos?: number): FoundBlock | null {
  return pos === undefined ? selectedBlock(tr.selection) : blockAt(tr.doc, pos);
}

function setDropRefused(view: EditorView, refused: boolean) {
  dropHost(view)?.classList.toggle(DROP_REFUSED_CLASS, refused);
}

function dropRefused(view: EditorView, event: DragEvent): boolean {
  const slice = view.dragging?.slice;
  if (!slice) return false;
  const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
  return !!hit && dropWouldNestRow(view.state.doc, hit.pos, slice);
}

/**
 * Block-level commands behind the editor's side menu (⋮⋮ grip: Move up,
 * Move down, Duplicate, Delete; + button: new line after) and the
 * Alt+↑ / Alt+↓ shortcuts, plus a drop guard so a column row is never
 * dropped inside another row.
 *
 * Keyboard semantics: Alt+↑/↓ move the innermost block holding the cursor
 * that is a direct child of the page, a column or a collapsible. In a list,
 * quote or table that is the whole list / quote / table (reordering list
 * items is left to cut and paste — one predictable rule beats a special
 * case). In a collapsible's title it is the whole collapsible. At the top or
 * bottom of its container the block stays put (a move never leaves a column)
 * and the key is still swallowed, so the cursor doesn't jump instead.
 */
export const BlockMove = Extension.create({
  name: "blockMove",

  addCommands() {
    return {
      moveBlockUp:
        (pos) =>
        ({ tr }) => {
          const block = targetBlock(tr, pos);
          if (!block || moveBlock(tr, block, -1) === null) return false;
          if (pos === undefined) tr.scrollIntoView();
          return true;
        },
      moveBlockDown:
        (pos) =>
        ({ tr }) => {
          const block = targetBlock(tr, pos);
          if (!block || moveBlock(tr, block, 1) === null) return false;
          if (pos === undefined) tr.scrollIntoView();
          return true;
        },
      duplicateBlock:
        (pos) =>
        ({ tr }) => {
          const block = targetBlock(tr, pos);
          if (!block) return false;
          duplicateBlock(tr, block);
          return true;
        },
      deleteBlock:
        (pos) =>
        ({ tr }) => {
          const block = targetBlock(tr, pos);
          if (!block) return false;
          return deleteBlock(tr, block);
        },
      insertParagraphAfterBlock:
        (pos) =>
        ({ tr }) => {
          const block = targetBlock(tr, pos);
          if (!block) return false;
          if (insertParagraphAfter(tr, block) === null) return false;
          tr.scrollIntoView();
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const move = (dir: "up" | "down") => () => {
      if (!selectedBlock(this.editor.state.selection)) return false;
      if (dir === "up") this.editor.commands.moveBlockUp();
      else this.editor.commands.moveBlockDown();
      return true;
    };
    return {
      "Alt-ArrowUp": move("up"),
      "Alt-ArrowDown": move("down"),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockMoveDropGuard"),
        // Drops onto atom node views (images, galleries…): see
        // node-view-drop.ts.
        view: (view) => ({ destroy: attachNodeViewDrop(view) }),
        // ProseMirror ends a node drop with a NodeSelection on the dropped
        // node. For a paragraph, heading, list or row that means the next
        // keystroke replaces the whole block, so put the cursor at the end of
        // it instead. Atoms (images, galleries…) keep their node selection.
        appendTransaction(transactions, _oldState, state) {
          if (!transactions.some((tr) => tr.getMeta("uiEvent") === "drop")) {
            return null;
          }
          return caretAfterDroppedBlock(state);
        },
        props: {
          // The real guard: swallow a drop that would nest a row (true =
          // handled, so ProseMirror inserts nothing and the source stays).
          handleDrop(view, event, slice) {
            setDropRefused(view, false);
            const hit = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            return !!hit && dropWouldNestRow(view.state.doc, hit.pos, slice);
          },
          handleDOMEvents: {
            // Feedback while dragging: over a refused spot, skip
            // ProseMirror's dragover (whose preventDefault is what marks the
            // spot droppable) so the browser shows "no drop", and hide the
            // drop cursor (it can't be told to hide, only not to move).
            dragover(view, event) {
              const refused = dropRefused(view, event);
              setDropRefused(view, refused);
              if (refused && event.dataTransfer) {
                event.dataTransfer.dropEffect = "none";
              }
              return refused;
            },
            dragleave(view, event) {
              const to = event.relatedTarget;
              if (!(to instanceof Node) || !view.dom.contains(to)) {
                setDropRefused(view, false);
              }
              return false;
            },
            dragend(view) {
              setDropRefused(view, false);
              return false;
            },
          },
        },
      }),
    ];
  },
});
