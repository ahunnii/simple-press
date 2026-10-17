import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import {
  CodeIcon,
  DotsHorizontalIcon,
  FontBoldIcon,
  FontItalicIcon,
  StrikethroughIcon,
  TextNoneIcon,
  UnderlineIcon,
} from "@radix-ui/react-icons";
import { Highlighter, Subscript, Superscript } from "lucide-react";

import type { FormatAction } from "../../types";
import type { toggleVariants } from "~/components/ui/toggle";

import { ToolbarSection } from "../toolbar-section";

type TextStyleAction =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "highlight"
  | "superscript"
  | "subscript"
  | "code"
  | "clearFormatting";

interface TextStyle extends FormatAction {
  value: TextStyleAction;
}

const formatActions: TextStyle[] = [
  {
    value: "bold",
    label: "Bold",
    icon: <FontBoldIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleBold().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "B"],
  },
  {
    value: "italic",
    label: "Italic",
    icon: <FontItalicIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleItalic().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "I"],
  },
  {
    value: "underline",
    label: "Underline",
    icon: <UnderlineIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleUnderline().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "U"],
  },
  {
    value: "strikethrough",
    label: "Strikethrough",
    icon: <StrikethroughIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleStrike().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "shift", "S"],
  },
  {
    value: "highlight",
    label: "Highlight",
    icon: <Highlighter className="size-5" />,
    action: (editor) => editor.chain().focus().toggleHighlight().run(),
    isActive: (editor) => editor.isActive("highlight"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleHighlight().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "shift", "H"],
  },
  {
    value: "superscript",
    label: "Superscript",
    icon: <Superscript className="size-5" />,
    action: (editor) => editor.chain().focus().toggleSuperscript().run(),
    isActive: (editor) => editor.isActive("superscript"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleSuperscript().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "."],
  },
  {
    value: "subscript",
    label: "Subscript",
    icon: <Subscript className="size-5" />,
    action: (editor) => editor.chain().focus().toggleSubscript().run(),
    isActive: (editor) => editor.isActive("subscript"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleSubscript().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", ","],
  },
  {
    value: "code",
    label: "Code",
    icon: <CodeIcon className="size-5" />,
    action: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
    canExecute: (editor) =>
      editor.can().chain().focus().toggleCode().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "E"],
  },
  {
    value: "clearFormatting",
    label: "Clear formatting",
    icon: <TextNoneIcon className="size-5" />,
    action: (editor) => editor.chain().focus().unsetAllMarks().run(),
    isActive: () => false,
    canExecute: (editor) =>
      editor.can().chain().focus().unsetAllMarks().run() &&
      !editor.isActive("codeBlock"),
    shortcuts: ["mod", "\\"],
  },
];

interface SectionTwoProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  activeActions?: TextStyleAction[];
  mainActionCount?: number;
}

export const SectionTwo: React.FC<SectionTwoProps> = ({
  editor,
  activeActions = formatActions.map((action) => action.value),
  mainActionCount = 2,
  size,
  variant,
}) => {
  return (
    <ToolbarSection
      editor={editor}
      actions={formatActions}
      activeActions={activeActions}
      mainActionCount={mainActionCount}
      dropdownIcon={<DotsHorizontalIcon className="size-5" />}
      dropdownTooltip="More formatting"
      dropdownClassName="w-8"
      size={size}
      variant={variant}
    />
  );
};

SectionTwo.displayName = "SectionTwo";

export default SectionTwo;
