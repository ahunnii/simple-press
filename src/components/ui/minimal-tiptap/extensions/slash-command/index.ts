import type { Editor, Range, Storage } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import type { SuggestionProps } from "@tiptap/suggestion";
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { exitSuggestion, Suggestion } from "@tiptap/suggestion";

/**
 * The "/" insert menu's trigger. Typing "/" at the start of an empty (or
 * whitespace-only) paragraph starts a suggestion; this extension only
 * tracks it. The menu itself is `components/slash-menu/slash-menu.tsx`,
 * mounted inside `MainMinimalTiptapEditor` so it can read the insert dialog
 * context and the editor's feature flags. The two talk through this
 * extension's storage: a snapshot the menu subscribes to, and a key handler
 * the menu installs for ↑/↓/Enter/Tab.
 *
 * The block side menu's + button looks this extension up by name
 * ("slashCommand") and types "/" to open the menu on its fresh line.
 */

export interface SlashMenuSnapshot {
  active: boolean;
  query: string;
  /** The "/query" text, deleted when an item is picked. */
  range: Range;
  /** Viewport rect of the "/query" text (null when unknown). */
  clientRect: (() => DOMRect | null) | null;
}

export interface SlashCommandStorage {
  snapshot: SlashMenuSnapshot;
  listeners: Set<() => void>;
  /** Installed by the menu; returns true when it handled the key. */
  keyDownHandler: ((event: KeyboardEvent) => boolean) | null;
}

declare module "@tiptap/core" {
  interface Storage {
    slashCommand: SlashCommandStorage;
  }
}

export const SLASH_COMMAND_NAME = "slashCommand";

export const slashCommandPluginKey = new PluginKey("slashCommand");

const INACTIVE: SlashMenuSnapshot = {
  active: false,
  query: "",
  range: { from: 0, to: 0 },
  clientRect: null,
};

/**
 * Whether a "/" at `range` may open the menu: it must be the first
 * non-blank thing in a plain paragraph, with nothing typed after the query.
 * Code blocks and headings are left alone (their parent isn't a paragraph).
 */
export function isSlashAllowed(state: EditorState, range: Range) {
  const $from = state.doc.resolve(range.from);
  const parent = $from.parent;
  if (parent.type.name !== "paragraph") return false;
  const start = $from.start();
  const before = parent.textBetween(0, range.from - start, "\n", "￼");
  if (before.trim() !== "") return false;
  const toOffset = Math.min(range.to - start, parent.content.size);
  const after = parent.textBetween(toOffset, parent.content.size, "\n", "￼");
  return after.trim() === "";
}

export function getSlashStorage(editor: Editor): SlashCommandStorage | null {
  // Typed as always present, but only there when the extension is registered.
  const storage = editor.storage as Partial<
    Pick<Storage, typeof SLASH_COMMAND_NAME>
  >;
  return storage.slashCommand ?? null;
}

/** Closes the menu, leaving the typed "/query" text in place. */
export function closeSlashMenu(editor: Editor) {
  if (editor.isDestroyed) return;
  const storage = getSlashStorage(editor);
  if (!storage?.snapshot.active) return;
  exitSuggestion(editor.view, slashCommandPluginKey);
}

export const SlashCommand = Extension.create<
  Record<string, never>,
  SlashCommandStorage
>({
  name: SLASH_COMMAND_NAME,
  // Ahead of every keymap (lists' Enter, the table's Tab, ...) so ↑/↓/Enter/
  // Tab reach the menu while it's open; when it's closed the plugin passes.
  priority: 1000,

  addStorage() {
    return {
      snapshot: INACTIVE,
      listeners: new Set(),
      keyDownHandler: null,
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    const publish = (snapshot: SlashMenuSnapshot) => {
      storage.snapshot = snapshot;
      storage.listeners.forEach((listener) => listener());
    };
    // Bubble menus (row, table, link, ...) hide while the "/" menu is open
    // and only re-judge on a doc or selection change, which Escape doesn't
    // make. Their focus handler re-judges unconditionally, so nudge it once
    // the exit has landed (only while the editor really has focus).
    const editor = this.editor;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshBubbleMenus = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (editor.isDestroyed || !editor.view.hasFocus()) return;
        editor.emit("focus", {
          editor,
          event: new Event("focus") as FocusEvent,
          transaction: editor.state.tr,
        });
      });
    };
    const fromProps = (props: SuggestionProps): SlashMenuSnapshot => ({
      active: true,
      query: props.query,
      range: props.range,
      clientRect: props.clientRect ?? null,
    });

    return [
      Suggestion({
        editor: this.editor,
        pluginKey: slashCommandPluginKey,
        char: "/",
        allowSpaces: false,
        // `isSlashAllowed` does the start-of-paragraph check; Suggestion's own
        // `startOfLine` only looks at the text node before the caret.
        startOfLine: false,
        allowedPrefixes: null,
        decorationClass: "slash-command-query",
        allow: ({ state, range }) => isSlashAllowed(state, range),
        // The menu filters the shared insert registry itself.
        items: () => [],
        render: () => ({
          onStart: (props) => publish(fromProps(props)),
          onUpdate: (props) => publish(fromProps(props)),
          onExit: () => {
            publish(INACTIVE);
            refreshBubbleMenus();
          },
          onKeyDown: ({ event }) => storage.keyDownHandler?.(event) ?? false,
        }),
      }),
    ];
  },

  onDestroy() {
    this.storage.snapshot = INACTIVE;
    this.storage.listeners.clear();
    this.storage.keyDownHandler = null;
  },
});
