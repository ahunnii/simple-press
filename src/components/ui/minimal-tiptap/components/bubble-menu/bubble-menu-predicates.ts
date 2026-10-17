import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

import { slashCommandPluginKey } from "../../extensions/slash-command";

/**
 * Which floating menu owns the current selection. Pure functions of the
 * editor's state (no DOM), so each menu's `shouldShow` stays a stable
 * module-level reference and the "who wins" rules can be unit-tested.
 *
 * Precedence, most specific first: image / spacer (node-selected) → link →
 * table → columns. A link inside a table cell or a column gets the link menu
 * only; a spacer selected inside a column gets the spacer menu only.
 *
 * The "/" insert menu outranks them all: while it's open, no bubble menu
 * shows (they'd peek out from behind it).
 */

type MenuEditor = Pick<
  Editor,
  "isActive" | "isEditable" | "getAttributes" | "state"
>;

/**
 * The "/" insert menu is open. Read from the Suggestion plugin's state, so
 * it's in step with the state each bubble menu's `shouldShow` is judging
 * (the extension's storage snapshot only updates in the view update, after).
 */
export function isSlashMenuOpen(editor: Pick<Editor, "state">): boolean {
  const state = slashCommandPluginKey.getState(editor.state) as
    | { active?: boolean }
    | undefined;
  return state?.active === true;
}

/**
 * The cursor (or selection) is in a link with an href: shows the link
 * menu. A collapsed cursor counts — clicking or arrowing into a link must
 * bring up its menu, not only selecting its text.
 */
export function isLinkBubbleTarget(editor: MenuEditor): boolean {
  if (!editor.isEditable || isSlashMenuOpen(editor)) return false;
  if (!editor.isActive("link")) return false;
  const { href } = editor.getAttributes("link") as { href?: unknown };
  return typeof href === "string" && href !== "";
}

/** Table menu: the cursor is in a table, unless an image or link owns it. */
export function isTableBubbleTarget(editor: MenuEditor): boolean {
  return (
    editor.isEditable &&
    !isSlashMenuOpen(editor) &&
    editor.isActive("table") &&
    !editor.isActive("image") &&
    !isLinkBubbleTarget(editor)
  );
}

/**
 * Spacer menu: a spacer is node-selected (clicked). A collapsed cursor next
 * to one never counts, and neither does a text selection running past one.
 */
export function isSpacerBubbleTarget(editor: MenuEditor): boolean {
  return (
    editor.isEditable && !isSlashMenuOpen(editor) && editor.isActive("spacer")
  );
}

/**
 * Columns (row) menu: the cursor is in a row, unless a more specific menu
 * owns it — a selected image or spacer, a link (plain or button), or a
 * table cell.
 */
export function isColumnsBubbleTarget(editor: MenuEditor): boolean {
  return (
    editor.isEditable &&
    !isSlashMenuOpen(editor) &&
    editor.isActive("columns") &&
    !editor.isActive("table") &&
    !editor.isActive("image") &&
    !editor.isActive("spacer") &&
    !isLinkBubbleTarget(editor)
  );
}

/** Image menu: a node-selected image (and no "/" menu open). */
export function isImageBubbleTarget(
  editor: Pick<Editor, "isEditable" | "state">,
): boolean {
  const { selection } = editor.state;
  return (
    editor.isEditable &&
    !isSlashMenuOpen(editor) &&
    selection instanceof NodeSelection &&
    selection.node.type.name === "image"
  );
}
