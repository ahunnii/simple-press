import type { Editor } from "@tiptap/react";
import * as React from "react";
import {
  CodeIcon,
  DividerHorizontalIcon,
  ImageIcon,
  ListBulletIcon,
  QuoteIcon,
} from "@radix-ui/react-icons";
import {
  Calculator,
  ChevronsDownUp,
  Columns2,
  FormInput,
  Frame,
  Heading1,
  Heading2,
  Heading3,
  Images,
  ListOrdered,
  MoveVertical,
  Table,
  Video,
} from "lucide-react";

/**
 * The one list of things the editor can insert, shared by the toolbar's
 * Insert dropdown (`section/five.tsx`) and the "/" menu
 * (`slash-menu/slash-menu.tsx`). `getInsertItems` applies the feature flags
 * and the email subset once, so both surfaces always offer the same blocks.
 */

export type InsertItemValue =
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "image"
  | "video"
  | "gallery"
  | "embed"
  | "quoteCalculator"
  | "form"
  | "table"
  | "columns"
  | "details"
  | "spacer";

/** Inserts that need a dialog first (see `insert-dialog-context.tsx`). */
export type InsertDialogKind = "image" | "video";

export type InsertItemGroup = "Text" | "Media" | "Blocks" | "Layout";

export interface InsertItem {
  value: InsertItemValue;
  label: string;
  icon: React.ReactNode;
  /** Extra words the "/" menu matches on (lowercase). */
  keywords: string[];
  group: InsertItemGroup;
  /** Inserts straight away. Exactly one of `run` / `dialog` is set. */
  run?: (editor: Editor) => void;
  /** Opens this insert dialog instead; it inserts at the caret. */
  dialog?: InsertDialogKind;
  canExecute: (editor: Editor) => boolean;
  isActive?: (editor: Editor) => boolean;
  shortcuts: string[];
}

export const INSERT_ITEMS: readonly InsertItem[] = [
  {
    value: "heading1",
    label: "Heading 1",
    icon: <Heading1 className="size-5" />,
    keywords: ["h1", "title", "heading", "large"],
    group: "Text",
    run: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
    canExecute: (editor) => editor.can().setHeading({ level: 1 }),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    shortcuts: ["mod", "alt", "1"],
  },
  {
    value: "heading2",
    label: "Heading 2",
    icon: <Heading2 className="size-5" />,
    keywords: ["h2", "subtitle", "heading", "medium"],
    group: "Text",
    run: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
    canExecute: (editor) => editor.can().setHeading({ level: 2 }),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    shortcuts: ["mod", "alt", "2"],
  },
  {
    value: "heading3",
    label: "Heading 3",
    icon: <Heading3 className="size-5" />,
    keywords: ["h3", "heading", "small"],
    group: "Text",
    run: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
    canExecute: (editor) => editor.can().setHeading({ level: 3 }),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    shortcuts: ["mod", "alt", "3"],
  },
  {
    value: "bulletList",
    label: "Bullet list",
    icon: <ListBulletIcon className="size-5" />,
    keywords: ["ul", "unordered", "bullets", "list"],
    group: "Text",
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
    shortcuts: ["mod", "shift", "8"],
  },
  {
    value: "orderedList",
    label: "Numbered list",
    icon: <ListOrdered className="size-5" />,
    keywords: ["ol", "ordered", "numbers", "list"],
    group: "Text",
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
    shortcuts: ["mod", "shift", "7"],
  },
  {
    value: "blockquote",
    label: "Blockquote",
    icon: <QuoteIcon className="size-5" />,
    keywords: ["quote", "citation", "pull quote"],
    group: "Text",
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
    shortcuts: ["mod", "shift", "B"],
  },
  {
    value: "codeBlock",
    label: "Code block",
    icon: <CodeIcon className="size-5" />,
    keywords: ["code", "pre", "snippet"],
    group: "Text",
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
    shortcuts: ["mod", "alt", "C"],
  },
  {
    value: "horizontalRule",
    label: "Divider",
    icon: <DividerHorizontalIcon className="size-5" />,
    keywords: ["hr", "line", "separator", "rule", "horizontal"],
    group: "Text",
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().setHorizontalRule().run(),
    shortcuts: ["mod", "alt", "-"],
  },
  {
    value: "image",
    label: "Image",
    icon: <ImageIcon className="size-5" />,
    keywords: ["picture", "photo", "img", "upload", "media"],
    group: "Media",
    dialog: "image",
    canExecute: () => true,
    isActive: (editor) => editor.isActive("image"),
    shortcuts: [],
  },
  {
    value: "video",
    label: "Video",
    icon: <Video className="size-5" />,
    keywords: ["clip", "movie", "mp4", "media"],
    group: "Media",
    dialog: "video",
    canExecute: () => true,
    isActive: (editor) => editor.isActive("video"),
    shortcuts: [],
  },
  {
    value: "gallery",
    label: "Gallery",
    icon: <Images className="size-5" />,
    keywords: ["photos", "images", "slideshow", "carousel"],
    group: "Media",
    run: (editor) => editor.chain().focus().insertGallery().run(),
    canExecute: (editor) => editor.can().chain().focus().insertGallery().run(),
    shortcuts: [],
  },
  {
    value: "embed",
    label: "Embed",
    icon: <Frame className="size-5" />,
    keywords: ["iframe", "youtube", "map", "html", "widget"],
    group: "Media",
    run: (editor) => editor.chain().focus().insertEmbed().run(),
    canExecute: (editor) => editor.can().chain().focus().insertEmbed().run(),
    shortcuts: [],
  },
  {
    value: "quoteCalculator",
    label: "Quote calculator",
    icon: <Calculator className="size-5" />,
    keywords: ["estimate", "price", "pricing", "calculator"],
    group: "Blocks",
    run: (editor) => editor.chain().focus().insertQuoteCalculator().run(),
    canExecute: (editor) =>
      editor.can().chain().focus().insertQuoteCalculator().run(),
    shortcuts: [],
  },
  {
    value: "form",
    label: "Form",
    icon: <FormInput className="size-5" />,
    keywords: ["contact", "signup", "survey", "application"],
    group: "Blocks",
    run: (editor) => editor.chain().focus().insertForm().run(),
    canExecute: (editor) => editor.can().chain().focus().insertForm().run(),
    shortcuts: [],
  },
  {
    value: "table",
    label: "Table",
    icon: <Table className="size-5" />,
    keywords: ["grid", "rows", "cells"],
    group: "Blocks",
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    canExecute: (editor) => !editor.isActive("table"),
    isActive: (editor) => editor.isActive("table"),
    shortcuts: [],
  },
  {
    value: "columns",
    label: "Columns",
    icon: <Columns2 className="size-5" />,
    keywords: ["layout", "side by side", "two columns", "row"],
    group: "Layout",
    run: (editor) =>
      editor.chain().focus().insertColumns({ layout: "2" }).run(),
    // Refused inside an existing row: rows don't nest.
    canExecute: (editor) => editor.can().insertColumns({ layout: "2" }),
    isActive: (editor) => editor.isActive("columns"),
    shortcuts: [],
  },
  {
    value: "details",
    label: "Collapsible section",
    icon: <ChevronsDownUp className="size-5" />,
    keywords: ["accordion", "toggle", "details", "faq", "expand"],
    group: "Layout",
    run: (editor) => editor.chain().focus().setDetails().run(),
    canExecute: (editor) => editor.can().setDetails(),
    isActive: (editor) => editor.isActive("details"),
    shortcuts: [],
  },
  {
    value: "spacer",
    label: "Space",
    icon: <MoveVertical className="size-5" />,
    keywords: ["spacer", "gap", "blank", "padding"],
    group: "Layout",
    run: (editor) => editor.chain().focus().insertSpacer({ size: "md" }).run(),
    canExecute: (editor) => editor.can().insertSpacer({ size: "md" }),
    shortcuts: [],
  },
];

/** What each surface offers, in display order, before the flag gates. */
const SURFACE_VALUES: Record<
  InsertSurface,
  { default: readonly InsertItemValue[]; email: readonly InsertItemValue[] }
> = {
  // The Insert dropdown. Text styles, lists, image and video have their own
  // toolbar buttons, so they're not repeated here.
  toolbar: {
    default: [
      "codeBlock",
      "blockquote",
      "horizontalRule",
      "gallery",
      "embed",
      "quoteCalculator",
      "form",
      "table",
      "columns",
      "details",
      "spacer",
    ],
    email: ["blockquote", "horizontalRule"],
  },
  slash: {
    default: INSERT_ITEMS.map((item) => item.value),
    // Only what `createExtensions` registers in email mode (and what
    // `tiptap-to-email` renders): no code, video or rich blocks.
    email: [
      "heading1",
      "heading2",
      "heading3",
      "bulletList",
      "orderedList",
      "blockquote",
      "horizontalRule",
      "image",
    ],
  },
};

export type InsertSurface = "toolbar" | "slash";

export interface InsertItemGates {
  emailMode?: boolean;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
  layoutBlocksEnabled?: boolean;
  /**
   * Whether the video extension is registered (it only is when the editor
   * has a `videoUploader`). Derived from `editor` when left out.
   */
  videosEnabled?: boolean;
  editor?: Editor;
}

export function hasExtension(editor: Editor, name: string) {
  return editor.extensionManager.extensions.some((ext) => ext.name === name);
}

/** Whether a flag lets this item through. Doesn't check `canExecute`. */
function isGatedIn(value: InsertItemValue, gates: InsertItemGates) {
  switch (value) {
    case "gallery":
      return !!gates.galleriesEnabled;
    case "embed":
      return !!gates.embedsEnabled;
    case "quoteCalculator":
      return !!gates.quotesEnabled;
    case "form":
      return !!gates.formsEnabled;
    case "columns":
    case "details":
    case "spacer":
      return !!gates.layoutBlocksEnabled;
    case "video":
      return (
        !gates.emailMode &&
        (gates.videosEnabled ??
          (gates.editor ? hasExtension(gates.editor, "video") : false))
      );
    default:
      return true;
  }
}

const ITEMS_BY_VALUE = new Map(INSERT_ITEMS.map((item) => [item.value, item]));

/**
 * The insert items a surface offers for this editor's flags, in display
 * order. Selection-dependent refusals (`canExecute`) are left to the caller,
 * since they change as the caret moves.
 */
export function getInsertItems(
  surface: InsertSurface,
  gates: InsertItemGates,
): InsertItem[] {
  const values = SURFACE_VALUES[surface][gates.emailMode ? "email" : "default"];
  return values
    .filter((value) => isGatedIn(value, gates))
    .map((value) => ITEMS_BY_VALUE.get(value)!);
}

/**
 * The "/" menu's filter. Matches the label and keywords, case-insensitive;
 * label prefixes rank first, then word prefixes, then keyword prefixes, then
 * any substring. Ties keep the registry order.
 */
export function filterInsertItems(
  items: readonly InsertItem[],
  query: string,
): InsertItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];

  const rank = (item: InsertItem) => {
    const label = item.label.toLowerCase();
    if (label.startsWith(q)) return 0;
    if (label.split(/\s+/).some((word) => word.startsWith(q))) return 1;
    if (item.keywords.some((keyword) => keyword.startsWith(q))) return 2;
    if (
      label.includes(q) ||
      item.keywords.some((keyword) => keyword.includes(q))
    ) {
      return 3;
    }
    return -1;
  };

  return items
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}
