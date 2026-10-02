/**
 * Shared helpers for editor notes (visual editor -> platform operator inbox).
 *
 * Pure and dependency-free so client components (editor notes panel, platform
 * hub table/dialog) can import it. The storage-URL prefix helper that needs
 * env lives server-side in `~/lib/s3/url` (`editorNoteAttachmentPrefix`).
 */

/** Max photos a single note can carry. */
export const MAX_NOTE_ATTACHMENTS = 3;

/**
 * Path segment (directly under `{businessId}/`) that note attachments are
 * stored in. `listBusinessObjects` skips it so attachments never show up in the
 * Media Library or the store-transfer export.
 */
export const EDITOR_NOTE_KEY_SEGMENT = "editor-notes/";

/**
 * Human label for where a note points:
 *   "Whole site"        — no page
 *   "Homepage"          — page only
 *   "Homepage › Hero"   — page + section
 */
export function formatNoteScope({
  pageLabel,
  sectionLabel,
}: {
  pageLabel: string | null;
  sectionLabel?: string | null;
}): string {
  const page = pageLabel?.trim() ?? "";
  const section = sectionLabel?.trim() ?? "";
  if (page && section) return `${page} › ${section}`;
  if (page) return page;
  if (section) return section;
  return "Whole site";
}
