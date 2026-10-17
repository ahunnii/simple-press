"use client";

import type { Transaction } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import * as React from "react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import type { HoveredBlock } from "./side-menu-plugin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { blockSiblings } from "../../extensions/block-move/helpers";
import { SLASH_COMMAND_NAME } from "../../extensions/slash-command";
import { ShortcutKey } from "../shortcut-key";
import {
  blockSideMenuPluginKey,
  createBlockSideMenu,
} from "./side-menu-plugin";

/** Height of the grip / plus buttons (keep in sync with block-handle.css). */
const BUTTON_HEIGHT = 22;

/**
 * Meta on the menu's own Move up / Move down transactions: those keep the
 * menu open (to nudge a block several steps), any other selection change
 * closes it.
 */
const KEEP_MENU_OPEN_META = "blockSideMenu:keepOpen";

/**
 * Hook point for the "/" insert menu. Called by the + button once the fresh
 * empty line exists and holds the cursor: when the slash-command extension
 * (named "slashCommand") is registered, typing "/" there opens its menu
 * (the inserted "/" goes through a normal transaction, so the Suggestion
 * plugin sees it exactly like a keystroke);
 * without it, the cursor just waits on the empty line.
 */
export function openInsertMenuAtCursor(editor: Editor) {
  const hasSlashMenu = editor.extensionManager.extensions.some(
    (extension) => extension.name === SLASH_COMMAND_NAME,
  );
  if (hasSlashMenu) {
    editor
      .chain()
      .focus(null, { scrollIntoView: false })
      .insertContent("/")
      .run();
  }
}

/** Vertical offset that centres the buttons on the block's first line. */
function firstLineOffset(dom: HTMLElement) {
  const lineHeight = parseFloat(getComputedStyle(dom).lineHeight);
  if (!Number.isFinite(lineHeight)) return 0;
  return Math.max(0, (lineHeight - BUTTON_HEIGHT) / 2);
}

function isEmptyParagraph(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  return node?.type.name === "paragraph" && node.content.size === 0;
}

/**
 * The block side menu: a "+" (new line after this block) and a ⋮⋮ grip
 * (drag to move; click for Move up / Move down / Duplicate / Delete) that
 * follow the hovered block — top-level blocks, and blocks inside columns and
 * collapsibles. Hover tracking lives in `side-menu-plugin.ts`; the commands
 * in `extensions/block-move`. Hidden on touch screens and in read-only
 * editors (block-handle.css).
 */
export function BlockSideMenu({ editor }: { editor: Editor }) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [block, setBlock] = React.useState<HoveredBlock | null>(null);
  const blockRef = React.useRef<HoveredBlock | null>(null);
  const [menuOpen, setMenuOpenState] = React.useState(false);
  const menuOpenRef = React.useRef(false);
  const wasOpenRef = React.useRef(false);
  /** The last close came from a click / focus outside the menu. */
  const closedOutsideRef = React.useRef(false);
  const clearRef = React.useRef<(() => void) | null>(null);
  const draggingRef = React.useRef<unknown>(null);
  const gripId = React.useId();

  const setMenuOpen = React.useCallback((open: boolean) => {
    if (open) closedOutsideRef.current = false;
    menuOpenRef.current = open;
    setMenuOpenState(open);
  }, []);

  React.useEffect(() => {
    const controller = createBlockSideMenu({
      onChange: (next) => {
        blockRef.current = next;
        setBlock(next);
      },
      isLocked: () => menuOpenRef.current,
      getMenuElement: () => rootRef.current,
    });
    clearRef.current = controller.clear;
    editor.registerPlugin(controller.plugin);
    return () => {
      clearRef.current = null;
      if (!editor.isDestroyed) editor.unregisterPlugin(blockSideMenuPluginKey);
    };
  }, [editor]);

  // Close the menu once the owner goes back to editing: a press in the
  // editor, the editor taking focus, or any selection change that isn't one
  // of the menu's own Move up / Move down steps.
  React.useEffect(() => {
    if (!menuOpen) return;
    const dom = editor.view.dom;
    const close = () => {
      closedOutsideRef.current = true;
      setMenuOpen(false);
    };
    const onSelectionUpdate = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      if (!transaction.getMeta(KEEP_MENU_OPEN_META)) close();
    };
    dom.addEventListener("pointerdown", close, true);
    dom.addEventListener("mousedown", close, true);
    editor.on("focus", close);
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      dom.removeEventListener("pointerdown", close, true);
      dom.removeEventListener("mousedown", close, true);
      editor.off("focus", close);
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, menuOpen, setMenuOpen]);

  // Line the buttons up just left of the block (CSS shifts them by their
  // own width), in the coordinates of the menu's positioned ancestor.
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !block) return;
    const parent = root.offsetParent;
    if (!(parent instanceof HTMLElement)) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = block.dom.getBoundingClientRect();
    const top =
      rect.top -
      parentRect.top -
      parent.clientTop +
      parent.scrollTop +
      firstLineOffset(block.dom);
    const left =
      rect.left - parentRect.left - parent.clientLeft + parent.scrollLeft;
    root.style.transform = `translate(calc(${left}px - 100%), ${top}px)`;
  }, [block]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      setMenuOpen(open);
    },
    [setMenuOpen],
  );

  const siblings = block ? blockSiblings(editor.state.doc, block.pos) : null;
  const canMoveUp = !!siblings && siblings.index > 0;
  const canMoveDown = !!siblings && siblings.index < siblings.count - 1;

  const withBlock = (run: (pos: number) => void) => {
    const current = blockRef.current;
    if (current) run(current.pos);
  };

  const addLineAfter = () =>
    withBlock((pos) => {
      // An empty line already: just put the cursor in it.
      if (isEmptyParagraph(editor, pos)) {
        editor
          .chain()
          .setTextSelection(pos + 1)
          .focus(null, { scrollIntoView: false })
          .run();
      } else {
        editor
          .chain()
          .insertParagraphAfterBlock(pos)
          .focus(null, { scrollIntoView: false })
          .run();
      }
      openInsertMenuAtCursor(editor);
    });

  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    const current = blockRef.current;
    const { view } = editor;
    if (!current || !view.editable || !current.dom.isConnected) {
      event.preventDefault();
      return;
    }
    if (menuOpenRef.current) setMenuOpen(false);

    // Hand the view the block's slice and let ProseMirror's drop handler
    // (with Dropcursor) move it. The editor SELECTION is deliberately left
    // alone: `node` below is what tells the drop which block to delete, so a
    // press on the grip that starts (or half-starts) a drag never leaves a
    // NodeSelection behind — a stale one made the next keystroke replace the
    // whole block.
    const selection = NodeSelection.create(view.state.doc, current.pos);
    const slice = selection.content();
    const { dom, text } = view.serializeForClipboard(slice);
    const data = event.dataTransfer;
    data.clearData();
    data.setData("text/html", dom.innerHTML);
    data.setData("text/plain", text);
    data.effectAllowed = "copyMove";
    data.setDragImage(current.dom, 0, 0);

    // `node` makes the drop delete exactly this block whatever the
    // selection is (prosemirror-view's own Dragging shape; the view keeps it
    // mapped if the doc changes mid-drag).
    const dragging = { slice, move: true, node: selection };
    view.dragging = dragging;
    draggingRef.current = dragging;
    // Backup cleanup in case the grip's own dragend never arrives.
    document.addEventListener("dragend", onDragEnd, {
      capture: true,
      once: true,
    });
  };

  function onDragEnd() {
    const { view } = editor;
    const dragging = draggingRef.current;
    if (!dragging) return;
    draggingRef.current = null;
    // The grip lives outside the editor, so ProseMirror's own dragend
    // cleanup never sees this drag (a drop inside clears it already).
    window.setTimeout(() => {
      if (view.dragging === dragging) view.dragging = null;
    }, 50);
  }

  const toggleFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setMenuOpen(!menuOpenRef.current);
    }
  };

  const visible = block !== null || menuOpen;

  return (
    <div
      ref={rootRef}
      className="mt-block-side-menu"
      data-visible={visible ? "true" : "false"}
      onMouseLeave={(event) => {
        // Off the menu and not back into the editor: hide it.
        const to = event.relatedTarget;
        if (to instanceof Node && editor.view.dom.contains(to)) return;
        if (!menuOpenRef.current) clearRef.current?.();
      }}
    >
      <button
        type="button"
        className="mt-block-side-menu__button"
        aria-label="Add a line below"
        title="Add a line below"
        onMouseDown={(event) => event.preventDefault()}
        onClick={addLineAfter}
      >
        <Plus className="size-4" aria-hidden />
      </button>

      <DropdownMenu
        open={menuOpen}
        onOpenChange={handleOpenChange}
        modal={false}
      >
        <div
          id={gripId}
          role="button"
          tabIndex={0}
          draggable
          className="mt-block-side-menu__button mt-block-side-menu__grip"
          aria-label="Drag to move, or click for options"
          title="Drag to move · Click for options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onPointerDown={() => {
            // An open (non-modal) menu closes itself on this press; remember
            // so the click that follows doesn't reopen it.
            wasOpenRef.current = menuOpenRef.current;
          }}
          onClick={() => setMenuOpen(!wasOpenRef.current)}
          onKeyDown={toggleFromKeyboard}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <GripVertical className="size-4" aria-hidden />
          {/* Positioning anchor only: the grip itself toggles the menu, since
              Radix opens a trigger on pointerdown, which would fight a drag. */}
          <DropdownMenuTrigger asChild>
            <span
              aria-hidden
              tabIndex={-1}
              className="mt-block-side-menu__anchor"
            />
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="w-48"
          aria-labelledby={gripId}
          onInteractOutside={() => {
            closedOutsideRef.current = true;
          }}
          onCloseAutoFocus={(event) => {
            // Never let Radix return focus to the (hidden) grip: that left
            // the editor blurred with a stale selection. After Escape or a
            // menu item, focus goes back to the editor with its CURRENT
            // selection (a no-op if it already has focus); after a click /
            // focus elsewhere, focus stays where the owner put it.
            event.preventDefault();
            const outside = closedOutsideRef.current;
            closedOutsideRef.current = false;
            if (!outside && !editor.isDestroyed) {
              editor.commands.focus(null, { scrollIntoView: false });
            }
          }}
        >
          <DropdownMenuItem
            disabled={!canMoveUp}
            onSelect={(event) => {
              // Stay open so the block can be nudged several steps.
              event.preventDefault();
              withBlock((pos) =>
                editor
                  .chain()
                  .setMeta(KEEP_MENU_OPEN_META, true)
                  .moveBlockUp(pos)
                  .run(),
              );
            }}
          >
            <ArrowUp aria-hidden />
            Move up
            <ShortcutKey keys={["alt", "↑"]} className="ml-auto" />
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMoveDown}
            onSelect={(event) => {
              event.preventDefault();
              withBlock((pos) =>
                editor
                  .chain()
                  .setMeta(KEEP_MENU_OPEN_META, true)
                  .moveBlockDown(pos)
                  .run(),
              );
            }}
          >
            <ArrowDown aria-hidden />
            Move down
            <ShortcutKey keys={["alt", "↓"]} className="ml-auto" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              withBlock((pos) =>
                editor
                  .chain()
                  .focus(null, { scrollIntoView: false })
                  .duplicateBlock(pos)
                  .run(),
              )
            }
          >
            <Copy aria-hidden />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              withBlock((pos) =>
                editor
                  .chain()
                  .focus(null, { scrollIntoView: false })
                  .deleteBlock(pos)
                  .run(),
              )
            }
          >
            <Trash2 aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
