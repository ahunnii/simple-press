import * as React from "react";
import { ChevronDown, Images, Link2 } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { UploadDropzone } from "~/components/media/upload-dropzone";

import { isUrl } from "../../utils";

interface ImageEditBlockProps {
  /** Several files / library picks at once (insert); one (replace). */
  multiple: boolean;
  /** Show "Choose from library" (only when the `media` flag is on). */
  mediaEnabled: boolean;
  /** Line under the drop target (size limit etc.). */
  helperText: string;
  onFiles: (files: File[]) => void;
  onChooseLibrary: () => void;
  onUrl: (url: string) => void;
}

/** An image link is usable when it's an http(s) URL or a site path. */
const isUsableImageLink = (value: string) =>
  value.startsWith("/") ? !value.startsWith("//") : isUrl(value);

/**
 * Body of the image insert/replace dialog: a drop target (click or drag),
 * "Choose from library", and a tucked-away "Paste an image link" field.
 * The dialog (`image-edit-dialog.tsx`) owns validation and what happens
 * with the result.
 */
export const ImageEditBlock: React.FC<ImageEditBlockProps> = ({
  multiple,
  mediaEnabled,
  helperText,
  onFiles,
  onChooseLibrary,
  onUrl,
}) => {
  const linkId = React.useId();
  const [showLink, setShowLink] = React.useState(false);
  const [link, setLink] = React.useState("");
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const value = link.trim();
      if (!value) return;
      if (!isUsableImageLink(value)) {
        setLinkError("Enter a full link starting with https://");
        return;
      }
      setLinkError(null);
      onUrl(value);
    },
    [link, onUrl],
  );

  return (
    <div className="space-y-3">
      <UploadDropzone
        kind="image"
        isUploading={false}
        multiple={multiple}
        onFiles={onFiles}
        helperText={helperText}
      />

      {mediaEnabled && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onChooseLibrary}
        >
          <Images className="size-4" />
          Choose from library
        </Button>
      )}

      <div className="border-t pt-3">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          aria-expanded={showLink}
          onClick={() => setShowLink((v) => !v)}
        >
          <Link2 className="size-4" aria-hidden="true" />
          Paste an image link
          <ChevronDown
            className={cn("size-4 transition-transform", {
              "rotate-180": showLink,
            })}
            aria-hidden="true"
          />
        </button>

        {showLink && (
          <form onSubmit={handleSubmit} className="mt-2 space-y-1">
            <Label htmlFor={linkId} className="sr-only">
              Image link
            </Label>
            <div className="flex gap-2">
              <Input
                id={linkId}
                type="text"
                inputMode="url"
                autoFocus
                placeholder="https://example.com/photo.jpg"
                value={link}
                className="grow"
                aria-invalid={linkError ? true : undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setLink(e.target.value);
                  setLinkError(null);
                }}
              />
              <Button type="submit" disabled={!link.trim()}>
                {multiple ? "Insert" : "Use link"}
              </Button>
            </div>
            {linkError && (
              <p role="alert" className="text-destructive text-sm">
                {linkError}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default ImageEditBlock;
