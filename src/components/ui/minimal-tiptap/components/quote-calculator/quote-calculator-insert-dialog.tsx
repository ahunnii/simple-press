import type { Editor } from "@tiptap/react";
import { Calculator } from "lucide-react";

import { ToolbarButton } from "../toolbar-button";

interface QuoteCalculatorInsertDialogProps {
  editor: Editor;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

export const QuoteCalculatorInsertDialog: React.FC<
  QuoteCalculatorInsertDialogProps
> = ({ editor, size, variant }) => {
  const handleInsertQuoteCalculator = () => {
    editor.chain().focus().insertQuoteCalculator().run();
  };

  return (
    <ToolbarButton
      onClick={handleInsertQuoteCalculator}
      tooltip="Insert quote calculator"
      aria-label="Insert quote calculator"
      size={size}
      variant={variant}
    >
      <Calculator className="size-5" />
    </ToolbarButton>
  );
};
