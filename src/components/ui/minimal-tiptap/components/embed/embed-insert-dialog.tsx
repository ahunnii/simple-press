import type { Editor } from "@tiptap/react";
import { Frame } from "lucide-react";

import { ToolbarButton } from "../toolbar-button";

interface EmbedInsertDialogProps {
  editor: Editor;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

export const EmbedInsertDialog: React.FC<EmbedInsertDialogProps> = ({
  editor,
  size,
  variant,
}) => {
  const handleInsertEmbed = () => {
    editor.chain().focus().insertEmbed().run();
  };

  return (
    <ToolbarButton
      onClick={handleInsertEmbed}
      tooltip="Insert embed"
      aria-label="Insert embed"
      size={size}
      variant={variant}
    >
      <Frame className="size-5" />
    </ToolbarButton>
  );
};
