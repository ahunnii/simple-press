import type { UploadHookControl } from "@better-upload/client";
import { useId } from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "~/components/ui/button";

type UploadButtonProps = {
  control: UploadHookControl<false>;
  id?: string;
  accept?: string;
  metadata?: Record<string, unknown>;
  uploadOverride?: (
    ...args: Parameters<UploadHookControl<false>["upload"]>
  ) => void;

  // Add any additional props you need.
};

export function UploadButton({
  control: { upload, isPending },
  id: _id,
  accept,
  metadata,
  uploadOverride,
}: UploadButtonProps) {
  const id = useId();

  return (
    <Button disabled={isPending} className="relative" type="button">
      <label
        htmlFor={_id ?? id}
        className="has-[:focus-visible]:ring-ring/50 absolute inset-0 cursor-pointer has-[:focus-visible]:ring-[3px] has-[:focus-visible]:outline-none"
      >
        <input
          id={_id ?? id}
          disabled={isPending}
          placeholder="Upload file"
          className="absolute inset-0 size-0 opacity-0"
          type="file"
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.[0] && !isPending) {
              if (uploadOverride) {
                uploadOverride(e.target.files[0], { metadata });
              } else {
                void upload(e.target.files[0], { metadata });
              }
            }
            e.target.value = "";
          }}
        />
      </label>
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Upload file
        </>
      ) : (
        <>
          <Upload className="size-4" />
          Upload file
        </>
      )}
    </Button>
  );
}
