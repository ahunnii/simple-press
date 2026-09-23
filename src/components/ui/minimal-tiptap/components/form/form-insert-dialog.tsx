import type { Editor } from "@tiptap/react";
import { FormInput } from "lucide-react";

import { ToolbarButton } from "../toolbar-button";

interface FormInsertDialogProps {
  editor: Editor;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

export const FormInsertDialog: React.FC<FormInsertDialogProps> = ({
  editor,
  size,
  variant,
}) => {
  const handleInsertForm = () => {
    editor.chain().focus().insertForm().run();
  };

  return (
    <ToolbarButton
      onClick={handleInsertForm}
      tooltip="Insert form"
      aria-label="Insert form"
      size={size}
      variant={variant}
    >
      <FormInput className="size-5" />
    </ToolbarButton>
  );
};
