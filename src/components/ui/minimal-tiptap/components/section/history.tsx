import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { useEditorState } from "@tiptap/react";
import { Redo2, Undo2 } from "lucide-react";

import type { toggleVariants } from "~/components/ui/toggle";

import { getShortcutKey } from "../../utils";
import { ToolbarButton } from "../toolbar-button";

const shortcutLabel = (keys: string[]) =>
  keys.map((key) => getShortcutKey(key).symbol).join(" ");

interface SectionHistoryProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
}

export const SectionHistory: React.FC<SectionHistoryProps> = ({
  editor,
  size,
  variant,
}) => {
  // Narrow subscription (see MainMinimalTiptapEditor): only whether undo/redo
  // is currently possible, so the buttons don't re-render on every transaction.
  const history = useEditorState({
    editor,
    selector: (ctx) => ({
      canUndo: ctx.editor.can().undo(),
      canRedo: ctx.editor.can().redo(),
    }),
  });

  return (
    <>
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!history?.canUndo}
        tooltip={`Undo ${shortcutLabel(["mod", "Z"])}`}
        aria-label="Undo"
        size={size}
        variant={variant}
      >
        <Undo2 className="size-5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!history?.canRedo}
        tooltip={`Redo ${shortcutLabel(["mod", "shift", "Z"])}`}
        aria-label="Redo"
        size={size}
        variant={variant}
      >
        <Redo2 className="size-5" />
      </ToolbarButton>
    </>
  );
};

SectionHistory.displayName = "SectionHistory";

export default SectionHistory;
