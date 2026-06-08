import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import {
  CaretDownIcon,
  CodeIcon,
  DividerHorizontalIcon,
  PlusIcon,
  QuoteIcon,
} from "@radix-ui/react-icons";
import { Frame, Images, Table } from "lucide-react";

import type { FormatAction } from "../../types";
import type { toggleVariants } from "~/components/ui/toggle";

import { EmbedInsertDialog } from "../embed/embed-insert-dialog";
import { GalleryInsertDialog } from "../gallery/gallery-insert-dialog";
import { ImageEditDialog } from "../image/image-edit-dialog";
import { LinkEditPopover } from "../link/link-edit-popover";
import { ToolbarSection } from "../toolbar-section";

type InsertElementAction =
  | "codeBlock"
  | "blockquote"
  | "horizontalRule"
  | "gallery"
  | "embed"
  | "table";
interface InsertElement extends FormatAction {
  value: InsertElementAction;
}

const formatActions: InsertElement[] = [
  {
    value: "codeBlock",
    label: "Code block",
    icon: <CodeIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleCodeBlock().run(),
    shortcuts: ["mod", "alt", "C"],
  },
  {
    value: "blockquote",
    label: "Blockquote",
    icon: <QuoteIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBlockquote().run(),
    shortcuts: ["mod", "shift", "B"],
  },
  {
    value: "horizontalRule",
    label: "Divider",
    icon: <DividerHorizontalIcon className="size-5" />,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    isActive: () => false,
    canExecute: (editor) =>
      editor.can().chain().focus().setHorizontalRule().run(),
    shortcuts: ["mod", "alt", "-"],
  },
  {
    value: "gallery",
    label: "Gallery",
    icon: <Images className="size-5" />,
    action: (editor) => editor.chain().focus().insertGallery().run(),
    isActive: () => false,
    canExecute: (editor) => editor.can().chain().focus().insertGallery().run(),
    shortcuts: ["mod", "alt", "G"],
  },
  {
    value: "embed",
    label: "Embed",
    icon: <Frame className="size-5" />,
    action: (editor) => editor.chain().focus().insertEmbed().run(),
    isActive: () => false,
    canExecute: (editor) => editor.can().chain().focus().insertEmbed().run(),
    shortcuts: ["mod", "alt", "E"],
  },
  {
    value: "table",
    label: "Table",
    icon: <Table className="size-5" />,
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    isActive: (editor) => editor.isActive("table"),
    canExecute: (editor) => !editor.isActive("table"),
    shortcuts: [],
  },
];

interface SectionFiveProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  activeActions?: InsertElementAction[];
  mainActionCount?: number;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
}

export const SectionFive: React.FC<SectionFiveProps> = ({
  editor,
  activeActions = formatActions.map((action) => action.value),
  mainActionCount = 0,
  size,
  variant,
  galleriesEnabled = true,
  embedsEnabled = true,
}) => {
  const filteredActions = activeActions
    .filter((a) => galleriesEnabled || a !== "gallery")
    .filter((a) => embedsEnabled || a !== "embed");

  return (
    <>
      <LinkEditPopover editor={editor} size={size} variant={variant} />
      <ImageEditDialog editor={editor} size={size} variant={variant} />
      {galleriesEnabled && (
        <GalleryInsertDialog
          editor={editor}
          size={size ?? "default"}
          variant={variant ?? "default"}
        />
      )}
      {embedsEnabled && (
        <EmbedInsertDialog
          editor={editor}
          size={size ?? "default"}
          variant={variant ?? "default"}
        />
      )}
      <ToolbarSection
        editor={editor}
        actions={formatActions}
        activeActions={filteredActions}
        mainActionCount={mainActionCount}
        dropdownIcon={
          <>
            <PlusIcon className="size-5" />
            <CaretDownIcon className="size-5" />
          </>
        }
        dropdownTooltip="Insert elements"
        size={size}
        variant={variant}
      />
    </>
  );
};

SectionFive.displayName = "SectionFive";

export default SectionFive;
