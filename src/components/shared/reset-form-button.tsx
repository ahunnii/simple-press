import { RefreshCcw } from "lucide-react";

import { Button } from "../ui/button";

export function ResetFormButton({
  disabled,
  handleReset,
}: {
  disabled: boolean;
  handleReset: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={handleReset}
    >
      <RefreshCcw className="mr-2 h-4 w-4" />
      <span className="hidden sm:inline">Reset</span>
      <span className="sm:hidden">Reset</span>
    </Button>
  );
}
