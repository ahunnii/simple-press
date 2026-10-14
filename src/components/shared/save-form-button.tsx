import { Save } from "lucide-react";

import { Button } from "../ui/button";

export function SaveFormButton({
  disabled,
  handleSave,
  isSaving,
  isUploading = false,
}: {
  disabled: boolean;
  handleSave?: () => void;
  isSaving: boolean;
  /** Shows "Uploading…" while a rich-text upload is still in flight. */
  isUploading?: boolean;
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
      ) : isUploading ? (
        <>
          <span className="saving-indicator" />
          Uploading…
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
