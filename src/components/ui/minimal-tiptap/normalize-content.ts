import type { Extension, JSONContent } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { isContentEmpty } from "~/lib/template-fields";

import { createExtensions } from "./hooks/use-minimal-tiptap";

/**
 * Change detection for forms that hold MinimalTiptap JSON.
 *
 * The editor's value-sync effect calls `setContent`, which in TipTap v3 emits
 * an update — so the form receives the editor's schema-normalized JSON (default
 * attrs filled in, a TrailingNode paragraph appended) even when nobody typed.
 * Comparing that to the saved JSON with RHF's `isDirty` reads "changed" on
 * load. These helpers push both sides through the same ProseMirror schema the
 * editor uses, so only real edits count.
 */

let cachedSchema: Schema | null = null;

function getEditorSchema(): Schema {
  // Video only registers when a videoUploader is passed; include it so docs
  // containing clips still normalize. Nothing else in the list varies the
  // schema (the feature flags only gate node views/toolbar buttons).
  cachedSchema ??= getSchema(
    createExtensions({
      placeholder: "",
      videoUploader: () => Promise.resolve(""),
    }) as unknown as Extension[],
  );
  return cachedSchema;
}

const EMPTY_KEY = "empty";

// Keyed by object identity: form values only get a new reference when the
// editor emits, so re-renders of an untouched tab are a lookup.
const keyCache = new WeakMap<object, string>();

function isEmptyParagraph(node: JSONContent | undefined) {
  return node?.type === "paragraph" && isContentEmpty(node);
}

const PADDED_CONTAINERS = new Set(["column", "detailsContent"]);

/**
 * ContainerTrailingParagraph pads a column / collapsible body that ends in a
 * non-paragraph (image, table, ...) with an empty paragraph, so the owner has
 * somewhere to click. Drop that paragraph (only when it follows a
 * non-paragraph sibling, which is the only case it is added) at any depth.
 */
function stripContainerPadding(node: JSONContent): JSONContent {
  if (!Array.isArray(node.content)) return node;
  let content = node.content.map(stripContainerPadding);
  if (node.type && PADDED_CONTAINERS.has(node.type) && content.length >= 2) {
    const last = content[content.length - 1];
    const before = content[content.length - 2];
    if (isEmptyParagraph(last) && before?.type !== "paragraph") {
      content = content.slice(0, -1);
    }
  }
  return { ...node, content };
}

function computeKey(content: unknown): string {
  if (isContentEmpty(content as TiptapJSON)) return EMPTY_KEY;

  // Empty docs are the common on-load case (the editor turns `content: []`
  // into one empty paragraph) and are settled above; the schema round-trip
  // only smooths default attrs on real content, so it's best-effort.
  let json: JSONContent;
  try {
    json = Node.fromJSON(
      getEditorSchema(),
      content as Record<string, unknown>,
    ).toJSON() as JSONContent;
  } catch {
    // Unknown node/mark for this schema — fall back to the raw JSON.
    json = content as JSONContent;
  }

  json = stripContainerPadding(json);

  // The TrailingNode extension appends an empty paragraph after a trailing
  // heading/list/etc.; it's invisible, so it's not a change.
  if (json.type === "doc" && Array.isArray(json.content)) {
    const blocks = [...json.content];
    while (blocks.length > 0 && isEmptyParagraph(blocks[blocks.length - 1])) {
      blocks.pop();
    }
    json = { ...json, content: blocks };
  }

  return JSON.stringify(json);
}

/** Stable comparison key for a TipTap JSON value (any empty doc → same key). */
export function getEditorContentKey(content: unknown): string {
  if (content === null || typeof content !== "object") {
    return computeKey(content);
  }
  let key = keyCache.get(content);
  if (key === undefined) {
    key = computeKey(content);
    keyCache.set(content, key);
  }
  return key;
}

/** True when two TipTap JSON values render the same document. */
export function isEditorContentEqual(a: unknown, b: unknown): boolean {
  return getEditorContentKey(a) === getEditorContentKey(b);
}
