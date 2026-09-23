import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Images, Upload, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";

import type { VideoEditorOptions } from "../../extensions/video";
import type { toggleVariants } from "~/components/ui/toggle";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";

import {
  VIDEO_ACCEPTED_MIME_TYPES,
  VIDEO_MAX_FILE_SIZE,
} from "../../extensions/video";
import { Spinner } from "../spinner";
import { ToolbarButton } from "../toolbar-button";

interface VideoInsertDialogProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
}

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`;

/**
 * Toolbar button + dialog for inserting a video clip. Uploads first and only
 * inserts the node once the stored URL is back (see `VideoEditorOptions`),
 * so the doc never holds a `blob:` src. Only rendered when the `video`
 * extension is registered, i.e. the editor was given a `videoUploader`.
 */
export const VideoInsertDialog = ({
  editor,
  size,
  variant,
}: VideoInsertDialogProps) => {
  const options = editor.extensionManager.extensions.find(
    (ext) => ext.name === "video",
  )?.options as VideoEditorOptions | undefined;
  const uploadFn = options?.uploadFn;
  const maxFileSize = options?.maxFileSize ?? VIDEO_MAX_FILE_SIZE;
  const mediaEnabled = options?.mediaEnabled ?? false;

  const [open, setOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [ambient, setAmbient] = React.useState(false);
  const [uploadingName, setUploadingName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const ambientId = React.useId();

  const isUploading = uploadingName !== null;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      // Keep the dialog up until the upload settles so the result always
      // has somewhere to land (and the owner sees the failure if it fails).
      if (!next && isUploading) return;
      if (next) {
        setAmbient(false);
        setError(null);
      }
      setOpen(next);
    },
    [isUploading],
  );

  const insertVideo = React.useCallback(
    (src: string) => {
      editor.chain().focus().setVideo({ src, ambient }).run();
    },
    [editor, ambient],
  );

  const handleFile = React.useCallback(
    async (file: File) => {
      if (!VIDEO_ACCEPTED_MIME_TYPES.includes(file.type)) {
        setError("Choose an MP4, WebM or MOV video.");
        return;
      }
      if (file.size > maxFileSize) {
        setError(
          `That video is ${formatMb(file.size)}. Videos must be ${formatMb(maxFileSize)} or smaller.`,
        );
        return;
      }
      if (!uploadFn) return;

      setError(null);
      setUploadingName(file.name);
      try {
        const src = await uploadFn(file);
        insertVideo(src);
        setUploadingName(null);
        setOpen(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setUploadingName(null);
        setError(`Upload failed: ${message}`);
        toast.error("Video upload failed", {
          position: "bottom-right",
          description: message,
        });
      }
    },
    [insertVideo, maxFileSize, uploadFn],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <ToolbarButton
            isActive={editor.isActive("video")}
            tooltip="Video"
            aria-label="Video"
            size={size}
            variant={variant}
          >
            <VideoIcon className="size-5" />
          </ToolbarButton>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add video</DialogTitle>
            <DialogDescription>
              MP4, WebM or MOV, up to {formatMb(maxFileSize)}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id={ambientId}
                checked={ambient}
                disabled={isUploading}
                onCheckedChange={(checked) => setAmbient(checked === true)}
              />
              <div className="grid gap-1">
                <Label htmlFor={ambientId}>
                  Ambient loop (muted, autoplays)
                </Label>
                <p className="text-muted-foreground text-xs">
                  Plays silently on repeat with no controls, like a moving
                  photo. Leave off for a normal player with sound.
                </p>
              </div>
            </div>

            {isUploading ? (
              <div
                role="status"
                aria-live="polite"
                className="bg-muted flex items-center gap-3 rounded-md p-3 text-sm"
              >
                <Spinner className="size-5 shrink-0" />
                <span className="min-w-0 truncate">
                  Uploading {uploadingName}…
                </span>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  Upload from device
                </Button>
                {mediaEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Hand off to the picker once this dialog has closed,
                      // so the two modals never fight over focus.
                      setOpen(false);
                      queueMicrotask(() => setPickerOpen(true));
                    }}
                  >
                    <Images className="size-4" />
                    Choose from library
                  </Button>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={VIDEO_ACCEPTED_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
        </DialogContent>
      </Dialog>

      {mediaEnabled && (
        <MediaPickerDialog
          kind="video"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={insertVideo}
        />
      )}
    </>
  );
};
