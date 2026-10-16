import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { ImageIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";

import type { ImageEditorOptions } from "../../extensions/image";
import type { toggleVariants } from "~/components/ui/toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { MediaPickerDialog } from "~/components/media/media-picker-dialog";
import {
  fileMatchesKind,
  MAX_UPLOAD_SIZE,
} from "~/components/media/upload-dropzone";

import { ToolbarButton } from "../toolbar-button";
import { ImageEditBlock } from "./image-edit-block";

const formatMb = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10}MB`;
};

/** What the dialog hands back in replace mode: a local file or a URL. */
export type ImageSource = File | string;

interface ImageInsertDialogProps {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Replace mode: one image only, handed to this callback instead of being
   * inserted at the cursor.
   */
  onReplace?: (source: ImageSource) => void;
}

/**
 * Insert (or replace) an image: drop/browse files, pick from the Media
 * Library, or paste a link. Mirrors `VideoInsertDialog`.
 *
 * Inserted files go in straight away as a local preview and upload in the
 * node view (`image-view-block.tsx`), which shows a spinner and toasts on
 * failure. The size check here is the editor's raw cap (`maxFileSize`):
 * photos above the 5MB storage limit are fine, because the uploader shrinks
 * them first and only fails if the result is still too big.
 */
export const ImageInsertDialog = ({
  editor,
  open,
  onOpenChange,
  onReplace,
}: ImageInsertDialogProps) => {
  const options = editor.extensionManager.extensions.find(
    (ext) => ext.name === "image",
  )?.options as Partial<ImageEditorOptions> | undefined;
  // `maxFileSize: 0` means "no cap" to the extension; fall back to storage's.
  const configuredMax = options?.maxFileSize ?? 0;
  const maxFileSize = configuredMax > 0 ? configuredMax : MAX_UPLOAD_SIZE.image;
  const mediaEnabled = options?.mediaEnabled ?? false;
  const isReplace = onReplace !== undefined;

  const [pickerOpen, setPickerOpen] = React.useState(false);

  /** Insert at the cursor, or hand the first source to `onReplace`. */
  const commit = React.useCallback(
    (sources: ImageSource[]) => {
      if (sources.length === 0) return;
      if (onReplace) {
        onReplace(sources[0]!);
      } else {
        editor
          .chain()
          .focus()
          .setImages(sources.map((src) => ({ src })))
          .run();
      }
    },
    [editor, onReplace],
  );

  const handleFiles = React.useCallback(
    (files: File[]) => {
      const valid: File[] = [];
      for (const file of files) {
        if (!fileMatchesKind(file, "image")) {
          toast.error(`${file.name} isn't an image`, {
            position: "bottom-right",
            description: "Choose a JPG, PNG, WebP, GIF or HEIC file.",
          });
          continue;
        }
        if (file.size > maxFileSize) {
          toast.error(`${file.name} is too big`, {
            position: "bottom-right",
            description: `It's ${formatMb(file.size)}. Images can be up to ${formatMb(maxFileSize)}.`,
          });
          continue;
        }
        valid.push(file);
      }
      if (valid.length === 0) return;
      commit(isReplace ? valid.slice(0, 1) : valid);
      onOpenChange(false);
    },
    [commit, isReplace, maxFileSize, onOpenChange],
  );

  const handleUrl = React.useCallback(
    (url: string) => {
      commit([url]);
      onOpenChange(false);
    },
    [commit, onOpenChange],
  );

  const handleChooseLibrary = React.useCallback(() => {
    // Hand off to the picker once this dialog has closed, so the two modals
    // never fight over focus.
    onOpenChange(false);
    queueMicrotask(() => setPickerOpen(true));
  }, [onOpenChange]);

  const helperText =
    maxFileSize > MAX_UPLOAD_SIZE.image
      ? `Up to ${formatMb(maxFileSize)}. Big photos are shrunk automatically.`
      : `Up to ${formatMb(maxFileSize)}.`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isReplace ? "Replace image" : "Add images"}
            </DialogTitle>
            <DialogDescription>
              {isReplace
                ? "Choose the new picture. Its size and alignment stay the same."
                : "Upload from your device or pick photos you've already added."}
            </DialogDescription>
          </DialogHeader>
          <ImageEditBlock
            multiple={!isReplace}
            mediaEnabled={mediaEnabled}
            helperText={helperText}
            onFiles={handleFiles}
            onChooseLibrary={handleChooseLibrary}
            onUrl={handleUrl}
          />
        </DialogContent>
      </Dialog>

      {mediaEnabled &&
        (isReplace ? (
          <MediaPickerDialog
            kind="image"
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onSelect={(url) => commit([url])}
          />
        ) : (
          <MediaPickerDialog
            kind="image"
            multiple
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onSelectMany={(urls) => commit(urls)}
          />
        ))}
    </>
  );
};

interface ImageEditDialogProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
}

/** Toolbar button that opens `ImageInsertDialog` in insert mode. */
const ImageEditDialog = ({ editor, size, variant }: ImageEditDialogProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ToolbarButton
        isActive={editor.isActive("image")}
        tooltip="Image"
        aria-label="Image"
        aria-haspopup="dialog"
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
      >
        <ImageIcon className="size-5" />
      </ToolbarButton>
      <ImageInsertDialog editor={editor} open={open} onOpenChange={setOpen} />
    </>
  );
};

export { ImageEditDialog };
