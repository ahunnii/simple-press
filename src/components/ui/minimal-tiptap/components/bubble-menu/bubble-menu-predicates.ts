import type { Editor } from "@tiptap/core";

/**
 * Which floating menu owns the current selection. Pure functions of the
 * editor's state (no DOM), so each menu's `shouldShow` stays a stable
 * module-level reference and the "who wins" rules can be unit-tested.
 *
 * Precedence, most specific first: image / spacer (node-selected) → link →
 * table → columns. A link inside a table cell or a column gets the link menu
 * only; a spacer selected inside a column gets the spacer menu only.
 */

type MenuEditor = Pick<Editor, "isActive" | "isEditable" | "getAttributes">;

/**
 * The cursor (or selection) is in a link with an href: shows the link
 * menu. A collapsed cursor counts — clicking or arrowing into a link must
 * bring up its menu, not only selecting its text.
 */
export function isLinkBubbleTarget(editor: MenuEditor): boolean {
  if (!editor.isEditable || !editor.isActive("link")) return false;
  const { href } = editor.getAttributes("link") as { href?: unknown };
  return typeof href === "string" && href !== "";
}

/** Table menu: the cursor is in a table, unless an image or link owns it. */
export function isTableBubbleTarget(editor: MenuEditor): boolean {
  return (
    editor.isEditable &&
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
  return editor.isEditable && editor.isActive("spacer");
}

/**
 * Columns (row) menu: the cursor is in a row, unless a more specific menu
 * owns it — a selected image or spacer, a link (plain or button), or a
 * table cell.
 */
export function isColumnsBubbleTarget(editor: MenuEditor): boolean {
  return (
    editor.isEditable &&
    editor.isActive("columns") &&
    !editor.isActive("table") &&
    !editor.isActive("image") &&
    !editor.isActive("spacer") &&
    !isLinkBubbleTarget(editor)
  );
}
