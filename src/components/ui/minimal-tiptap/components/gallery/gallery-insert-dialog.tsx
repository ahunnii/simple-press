import type { Editor } from "@tiptap/react";
import { Images } from "lucide-react";

import { ToolbarButton } from "../toolbar-button";

interface GalleryInsertDialogProps {
  editor: Editor;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

export const GalleryInsertDialog: React.FC<GalleryInsertDialogProps> = ({
  editor,
  size,
  variant,
}) => {
  const handleInsertGallery = () => {
    editor.chain().focus().insertGallery().run();
  };

  return (
    <ToolbarButton
      onClick={handleInsertGallery}
      tooltip="Insert gallery"
      aria-label="Insert gallery"
      size={size}
      variant={variant}
    >
      <Images className="size-5" />
    </ToolbarButton>
  );
};
