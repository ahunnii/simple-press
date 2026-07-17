import { Save } from "lucide-react";

import { Button } from "../ui/button";

export function SaveFormButton({
  disabled,
  handleSave,
  isSaving,
}: {
  disabled: boolean;
  handleSave?: () => void;
  isSaving: boolean;
}) {
  return (
    <Button
      type={!!handleSave ? "button" : "submit"}
      onClick={handleSave}
      size="sm"
      disabled={disabled}
    >
      {isSaving ? (
        <>
          <span className="saving-indicator" />
          Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Save
        </>
      )}
    </Button>
  );
}
