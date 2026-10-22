import type { JSONContent } from "@tiptap/core";

/**
 * Starter placeholder text: a short run in square brackets, e.g.
 * "[Your sale headline]". The starters (`starters.ts`) ship with these, and
 * owners sometimes forget to replace one before sending. Pure and
 * client-safe; used by the composer for a non-blocking heads-up.
 */
const PLACEHOLDER_PATTERN = /\[[^\]\n]{2,80}\]/g;

/** Text of every inline run in a tiptap doc, one string per text block. */
function bodyTextBlocks(doc: JSONContent | null | undefined): string[] {
  const blocks: string[] = [];
  const stack: unknown[] = [doc];
  const seen = new Set<unknown>();
  while (stack.length > 0) {
    const node = stack.pop();
    if (typeof node !== "object" || node === null || seen.has(node)) continue;
    seen.add(node);
    const { content } = node as JSONContent;
    if (!Array.isArray(content)) continue;
    const texts = content.filter(
      (c): c is JSONContent & { text: string } =>
        typeof c === "object" &&
        c !== null &&
        c.type === "text" &&
        typeof c.text === "string",
    );
    // Join a block's runs so a placeholder split across bold/italic marks
    // is still seen whole.
    if (texts.length > 0) blocks.push(texts.map((t) => t.text).join(""));
    // Reversed so blocks pop in document order.
    for (let i = content.length - 1; i >= 0; i--) stack.push(content[i]);
  }
  return blocks;
}

/**
 * Distinct "[bracketed]" placeholder snippets still left in the subject,
 * preview text or message body, in first-seen order (subject first).
 */
export function findPlaceholders(parts: {
  subject?: string | null;
  previewText?: string | null;
  bodyJson?: JSONContent | null;
}): string[] {
  const found = new Set<string>();
  for (const text of [
    parts.subject ?? "",
    parts.previewText ?? "",
    ...bodyTextBlocks(parts.bodyJson),
  ]) {
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) found.add(match[0]);
  }
  return [...found];
}

/** The note shown in the send / schedule dialogs and the composer. */
export const PLACEHOLDER_NOTE =
  "Your email still has placeholder text in [brackets]. Replace it before sending.";
