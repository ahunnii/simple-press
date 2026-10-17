"use client";

import type { Editor } from "@tiptap/react";
import * as React from "react";

import type {
  SlashCommandStorage,
  SlashMenuSnapshot,
} from "../../extensions/slash-command";
import type { InsertItem, InsertItemGates } from "../insert-items";
import { cn } from "~/lib/utils";

import {
  closeSlashMenu,
  getSlashStorage,
} from "../../extensions/slash-command";
import { useOpenInsertDialog } from "../insert-dialog-context";
import { filterInsertItems, getInsertItems } from "../insert-items";

/** Gap between the "/query" text and the menu, and the viewport margin. */
const GAP = 6;
const VIEWPORT_MARGIN = 8;

const noopSubscribe = () => () => undefined;
const INACTIVE_SNAPSHOT: SlashMenuSnapshot = {
  active: false,
  query: "",
  range: { from: 0, to: 0 },
  clientRect: null,
};

function useSlashSnapshot(storage: SlashCommandStorage | null) {
  const subscribe = React.useCallback(
    (listener: () => void) => {
      if (!storage) return noopSubscribe();
      storage.listeners.add(listener);
      return () => {
        storage.listeners.delete(listener);
      };
    },
    [storage],
  );
  const getSnapshot = () => storage?.snapshot ?? INACTIVE_SNAPSHOT;
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

type SlashMenuProps = Omit<InsertItemGates, "editor" | "videosEnabled"> & {
  editor: Editor;
};

/**
 * The "/" insert menu. Driven by the `slashCommand` extension (which spots
 * "/" at the start of an empty paragraph) and fed by the shared insert
 * registry with the same gates as the toolbar. Lives inside
 * `MainMinimalTiptapEditor`, so dialog items open the toolbar's own dialog
 * through `InsertDialogContext`. Focus never leaves the editor: keys arrive
 * through the extension's key handler, and clicks don't take focus.
 */
export function SlashMenu({ editor, ...gates }: SlashMenuProps) {
  const storage = getSlashStorage(editor);
  const snapshot = useSlashSnapshot(storage);
  if (!storage || !snapshot.active) return null;
  return (
    <SlashMenuList
      editor={editor}
      storage={storage}
      snapshot={snapshot}
      gates={gates}
    />
  );
}

function SlashMenuList({
  editor,
  storage,
  snapshot,
  gates,
}: {
  editor: Editor;
  storage: SlashCommandStorage;
  snapshot: SlashMenuSnapshot;
  gates: Omit<InsertItemGates, "editor" | "videosEnabled">;
}) {
  const openDialog = useOpenInsertDialog();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const { query } = snapshot;

  // Recomputed per keystroke: `canExecute` depends on where the caret is
  // (no Columns inside a column, no Table inside a table).
  const items = filterInsertItems(
    getInsertItems("slash", { ...gates, editor }).filter(
      (item) =>
        (item.dialog ? openDialog !== null : true) && item.canExecute(editor),
    ),
    query,
  );

  const [selection, setSelection] = React.useState({ query, index: 0 });
  const selectedIndex =
    selection.query === query
      ? Math.min(selection.index, Math.max(items.length - 1, 0))
      : 0;
  const select = (index: number) => setSelection({ query, index });

  const choose = (item: InsertItem) => {
    const { range } = snapshot;
    if (item.dialog) {
      // The dialog inserts at the caret: the now-empty line.
      editor.chain().deleteRange(range).run();
      openDialog?.(item.dialog);
      return;
    }
    editor.chain().focus().deleteRange(range).run();
    item.run?.(editor);
  };

  // Keys reach us through the extension (focus stays in the editor).
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) {
      return false;
    }
    if (items.length === 0) return false;
    switch (event.key) {
      case "ArrowDown":
        select((selectedIndex + 1) % items.length);
        return true;
      case "ArrowUp":
        select((selectedIndex - 1 + items.length) % items.length);
        return true;
      case "Enter":
      case "Tab": {
        const item = items[selectedIndex];
        if (!item) return false;
        choose(item);
        return true;
      }
      default:
        return false;
    }
  };
  const handleKeyDownRef = React.useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;
  React.useEffect(() => {
    storage.keyDownHandler = (event) => handleKeyDownRef.current(event);
    return () => {
      storage.keyDownHandler = null;
    };
  }, [storage]);

  // Clicking away (out of the editor) closes the menu; the "/query" stays.
  React.useEffect(() => {
    let timer: number | undefined;
    const onBlur = () => {
      window.clearTimeout(timer);
      // The + button refocuses the editor a frame later; give it a moment.
      timer = window.setTimeout(() => {
        if (!editor.isDestroyed && !editor.view.hasFocus()) {
          closeSlashMenu(editor);
        }
      }, 150);
    };
    editor.on("blur", onBlur);
    return () => {
      window.clearTimeout(timer);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  // Tie the editor (a textbox) to the list for screen readers.
  const activeId = items.length > 0 ? `${listId}-${selectedIndex}` : undefined;
  React.useEffect(() => {
    const dom = editor.view.dom;
    dom.setAttribute("aria-controls", listId);
    dom.setAttribute("aria-expanded", "true");
    return () => {
      dom.removeAttribute("aria-controls");
      dom.removeAttribute("aria-expanded");
      dom.removeAttribute("aria-activedescendant");
    };
  }, [editor, listId]);
  React.useEffect(() => {
    const dom = editor.view.dom;
    if (activeId) dom.setAttribute("aria-activedescendant", activeId);
    else dom.removeAttribute("aria-activedescendant");
  }, [editor, activeId]);

  // Below the "/query", flipped above when there's no room; positioned in
  // the editor frame's coordinates (it is `relative`), like the side menu.
  const position = React.useCallback(() => {
    const root = rootRef.current;
    const parent = root?.offsetParent;
    const rect = snapshot.clientRect?.();
    if (!root || !(parent instanceof HTMLElement) || !rect) return;
    const parentRect = parent.getBoundingClientRect();
    const height = root.offsetHeight;
    const width = root.offsetWidth;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove =
      spaceBelow < height + GAP + VIEWPORT_MARGIN && rect.top > spaceBelow;
    const top = placeAbove ? rect.top - GAP - height : rect.bottom + GAP;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    const x = left - parentRect.left - parent.clientLeft + parent.scrollLeft;
    const y = top - parentRect.top - parent.clientTop + parent.scrollTop;
    root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    root.style.visibility = "visible";
  }, [snapshot]);

  React.useLayoutEffect(() => {
    position();
  }, [position, items.length]);

  React.useEffect(() => {
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [position]);

  // Keep the highlighted item in view inside the list (not the page).
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const option = activeId ? document.getElementById(activeId) : null;
    if (!list || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [activeId]);

  const showGroups = query.trim() === "";

  return (
    <div
      ref={rootRef}
      className="bg-popover text-popover-foreground absolute top-0 left-0 z-50 w-60 rounded-md border shadow-md"
      style={{ visibility: "hidden" }}
      // Clicks never take focus from the editor.
      onMouseDown={(event) => event.preventDefault()}
    >
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Insert"
        className="relative max-h-80 overflow-y-auto p-1"
      >
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">
            No matches
          </p>
        ) : (
          items.map((item, index) => {
            const groupStart =
              showGroups && items[index - 1]?.group !== item.group;
            const selected = index === selectedIndex;
            return (
              <React.Fragment key={item.value}>
                {groupStart && (
                  <div
                    role="presentation"
                    className={cn(
                      "text-muted-foreground px-2 pb-1 text-xs font-medium",
                      index === 0 ? "pt-1" : "pt-2",
                    )}
                  >
                    {item.group}
                  </div>
                )}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none",
                    selected && "bg-accent text-accent-foreground",
                  )}
                  onMouseMove={() => {
                    if (!selected) select(index);
                  }}
                  onClick={() => choose(item)}
                >
                  <span
                    aria-hidden
                    className="bg-background text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-sm border [&_svg]:size-4"
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
