import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { CaretDownIcon } from "@radix-ui/react-icons";
import { useEditorState } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";

import type { FormatAction } from "../../types";
import type { toggleVariants } from "~/components/ui/toggle";

import { ToolbarSection } from "../toolbar-section";

type AlignAction = "alignLeft" | "alignCenter" | "alignRight";
interface AlignItem extends FormatAction {
  value: AlignAction;
}

type Alignment = "left" | "center" | "right";

/** Alignments the editor can store; anything else (e.g. justify) reads as left. */
const readAlignment = (editor: Editor): Alignment => {
  if (editor.isActive({ textAlign: "center" })) return "center";
  if (editor.isActive({ textAlign: "right" })) return "right";
  return "left";
};

const formatActions: AlignItem[] = [
  {
    value: "alignLeft",
    label: "Align left",
    icon: <AlignLeft className="size-5" />,
    // "Left" is the default, so it clears the attr instead of storing
    // `textAlign: "left"` — stored JSON stays clean.
    action: (editor) => editor.chain().focus().unsetTextAlign().run(),
    // Only an explicit "left" counts as active: the default must not light
    // up the dropdown trigger on every plain paragraph.
    isActive: (editor) => editor.isActive({ textAlign: "left" }),
    canExecute: (editor) => editor.can().unsetTextAlign(),
    shortcuts: ["mod", "shift", "L"],
  },
  {
    value: "alignCenter",
    label: "Align center",
    icon: <AlignCenter className="size-5" />,
    action: (editor) => editor.chain().focus().setTextAlign("center").run(),
    isActive: (editor) => readAlignment(editor) === "center",
    canExecute: (editor) => editor.can().setTextAlign("center"),
    shortcuts: ["mod", "shift", "E"],
  },
  {
    value: "alignRight",
    label: "Align right",
    icon: <AlignRight className="size-5" />,
    action: (editor) => editor.chain().focus().setTextAlign("right").run(),
    isActive: (editor) => readAlignment(editor) === "right",
    canExecute: (editor) => editor.can().setTextAlign("right"),
    shortcuts: ["mod", "shift", "R"],
  },
];

const ICONS: Record<Alignment, React.ReactNode> = {
  left: <AlignLeft className="size-5" />,
  center: <AlignCenter className="size-5" />,
  right: <AlignRight className="size-5" />,
};

interface SectionSixProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
  activeActions?: AlignAction[];
  mainActionCount?: number;
}

export const SectionSix: React.FC<SectionSixProps> = ({
  editor,
  activeActions = formatActions.map((action) => action.value),
  mainActionCount = 0,
  size,
  variant,
}) => {
  // Narrow subscription (see MainMinimalTiptapEditor): only the current
  // alignment, so the trigger icon follows the cursor without re-rendering
  // on every transaction.
  const alignment = useEditorState({
    editor,
    selector: (ctx) => readAlignment(ctx.editor),
  });

  return (
    <ToolbarSection
      editor={editor}
      actions={formatActions}
      activeActions={activeActions}
      mainActionCount={mainActionCount}
      dropdownIcon={
        <>
          {ICONS[alignment]}
          <CaretDownIcon className="size-5" />
        </>
      }
      dropdownTooltip="Text alignment"
      size={size}
      variant={variant}
    />
  );
};

SectionSix.displayName = "SectionSix";

export default SectionSix;
