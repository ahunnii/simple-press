import type { Extension } from "@tiptap/core";
import type { Content, Editor, UseEditorOptions } from "@tiptap/react";
import * as React from "react";
import { TextStyle } from "@tiptap/extension-text-style";
import { Typography } from "@tiptap/extension-typography";
import { Placeholder, Selection } from "@tiptap/extensions";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { toast } from "sonner";

import { cn } from "~/lib/utils";

import {
  CodeBlockLowlight,
  Color,
  Embed,
  FileHandler,
  Form,
  Gallery,
  HorizontalRule,
  Image,
  QuoteCalculator,
  ResetMarksOnEnter,
  TableKit,
  UnsetAllMarks,
  Video,
  VIDEO_ACCEPTED_MIME_TYPES,
  VIDEO_MAX_FILE_SIZE,
} from "../extensions";
import { useThrottle } from "../hooks/use-throttle";
import { fileToBase64, getOutput, randomId } from "../utils";

export interface UseMinimalTiptapEditorProps extends UseEditorOptions {
  value?: Content;
  output?: "html" | "json" | "text";
  placeholder?: string;
  editorClassName?: string;
  throttleDelay?: number;
  onUpdate?: (content: Content) => void;
  onBlur?: (content: Content) => void;
  uploader?: (file: File) => Promise<string>;
  /**
   * Uploads a video clip and resolves to its stored URL. The video node,
   * toolbar button and video drag/drop/paste are only enabled when this is
   * set. Must be a stable reference (it keys the extensions memo).
   */
  videoUploader?: (file: File) => Promise<string>;
  /**
   * Adds "Choose from library" to the video dialog. Only pass `true` when
   * the `media` feature flag is on.
   */
  mediaEnabled?: boolean;
  businessId?: string;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
}

async function fakeuploader(file: File): Promise<string> {
  // Fallback used only when no `uploader` prop is supplied. Encodes the image
  // as a base64 data URI, which bloats the DB — real callers should always
  // provide an `uploader` (see MinimalTiptapFormField, which wires one up to
  // S3 by default for every CMS form).

  // wait 3s to simulate upload
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const src = await fileToBase64(file);

  return src;
}

const IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;

const isVideoFile = (file: File) => file.type.startsWith("video/");

/**
 * Uploads a dropped/pasted clip, then inserts it — at `pos` for drops, at
 * the selection for pastes. Upload-first (never a `blob:` src in the doc);
 * a toast tracks progress since there's no node to show a spinner in yet.
 */
const uploadAndInsertVideo = async (
  editor: Editor,
  file: File,
  videoUploader: (file: File) => Promise<string>,
  pos?: number,
) => {
  const toastId = toast.loading(`Uploading ${file.name}…`, {
    position: "bottom-right",
  });
  try {
    const src = await videoUploader(file);
    if (editor.isDestroyed) return;
    const node = { type: "video", attrs: { src, title: null, ambient: false } };
    if (pos === undefined) {
      editor.commands.insertContent(node);
    } else {
      // The doc may have shrunk while the upload was in flight.
      editor.commands.insertContentAt(
        Math.min(pos, editor.state.doc.content.size),
        node,
      );
    }
    toast.success("Video added", { id: toastId, position: "bottom-right" });
  } catch (error) {
    toast.error("Video upload failed", {
      id: toastId,
      position: "bottom-right",
      description: error instanceof Error ? error.message : undefined,
    });
  }
};

const createExtensions = ({
  placeholder,
  uploader,
  videoUploader,
  mediaEnabled,
  businessId,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  formsEnabled,
}: {
  placeholder: string;
  uploader?: (file: File) => Promise<string>;
  videoUploader?: (file: File) => Promise<string>;
  mediaEnabled?: boolean;
  businessId?: string;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
}) => [
  StarterKit.configure({
    blockquote: { HTMLAttributes: { class: "block-node" } },
    // bold
    bulletList: { HTMLAttributes: { class: "list-node" } },
    code: { HTMLAttributes: { class: "inline", spellcheck: "false" } },
    codeBlock: false,
    // document
    dropcursor: { width: 2, class: "ProseMirror-dropcursor border" },
    // gapcursor
    // hardBreak
    heading: { HTMLAttributes: { class: "heading-node" } },
    // undoRedo
    horizontalRule: false,
    // italic
    // listItem
    // listKeymap
    link: {
      enableClickSelection: true,
      openOnClick: false,
      HTMLAttributes: {
        class: "link",
      },
    },
    orderedList: { HTMLAttributes: { class: "list-node" } },
    paragraph: { HTMLAttributes: { class: "text-node" } },
    // strike
    // text
    // underline
    // trailingNode
  }),
  Image.configure({
    allowedMimeTypes: ["image/*"],
    maxFileSize: 5 * 1024 * 1024,
    allowBase64: true,
    uploadFn: async (file) => {
      return uploader ? await uploader(file) : await fakeuploader(file);
    },
    onToggle(editor, files, pos) {
      editor.commands.insertContentAt(
        pos,
        files.map((image) => {
          const blobUrl = URL.createObjectURL(image);
          const id = randomId();

          return {
            type: "image",
            attrs: {
              id,
              src: blobUrl,
              alt: image.name,
              title: image.name,
              fileName: image.name,
            },
          };
        }),
      );
    },
    onValidationError(errors) {
      errors.forEach((error) => {
        toast.error("Image validation error", {
          position: "bottom-right",
          description: error.reason,
        });
      });
    },
    onActionSuccess({ action }) {
      const mapping = {
        copyImage: "Copy Image",
        copyLink: "Copy Link",
        download: "Download",
      };
      toast.success(mapping[action], {
        position: "bottom-right",
        description: "Image action success",
      });
    },
    onActionError(error, { action }) {
      const mapping = {
        copyImage: "Copy Image",
        copyLink: "Copy Link",
        download: "Download",
      };
      toast.error(`Failed to ${mapping[action]}`, {
        position: "bottom-right",
        description: error.message,
      });
    },
  }),
  FileHandler.configure({
    allowBase64: true,
    // Videos are only accepted when a videoUploader is configured; otherwise
    // they fail the type check exactly as before.
    allowedMimeTypes: videoUploader
      ? ["image/*", ...VIDEO_ACCEPTED_MIME_TYPES]
      : ["image/*"],
    maxFileSize: IMAGE_MAX_FILE_SIZE,
    maxFileSizeByType: { video: VIDEO_MAX_FILE_SIZE },
    onDrop: (editor, files, pos) => {
      if (videoUploader) {
        files
          .filter(isVideoFile)
          .forEach(
            (file) =>
              void uploadAndInsertVideo(editor, file, videoUploader, pos),
          );
      }
      void Promise.all(
        files
          .filter((file) => !isVideoFile(file))
          .map(async (file) => {
            // Prefer the configured uploader (S3) so dropped images don't end
            // up base64-encoded in the document. Base64 is a last-resort
            // fallback for when no uploader is configured at all.
            const src = uploader
              ? await uploader(file)
              : await fileToBase64(file);
            editor.commands.insertContentAt(pos, {
              type: "image",
              attrs: { src },
            });
          }),
      );
    },
    onPaste: (editor, files) => {
      if (videoUploader) {
        files
          .filter(isVideoFile)
          .forEach(
            (file) => void uploadAndInsertVideo(editor, file, videoUploader),
          );
      }
      void Promise.all(
        files
          .filter((file) => !isVideoFile(file))
          .map(async (file) => {
            // Same rationale as onDrop above — use the real uploader when set.
            const src = uploader
              ? await uploader(file)
              : await fileToBase64(file);
            editor.commands.insertContent({
              type: "image",
              attrs: { src },
            });
          }),
      );
    },
    onValidationError: (errors) => {
      errors.forEach((error) => {
        if (
          videoUploader &&
          error.file instanceof File &&
          isVideoFile(error.file)
        ) {
          toast.error("Video not added", {
            position: "bottom-right",
            description:
              error.reason === "size"
                ? `${error.file.name} is over 50MB. Trim or compress it and try again.`
                : `${error.file.name} isn't a supported video. Use MP4, WebM or MOV.`,
          });
          return;
        }
        toast.error("Image validation error", {
          position: "bottom-right",
          description: error.reason,
        });
      });
    },
  }),
  ...(videoUploader
    ? [
        Video.configure({
          uploadFn: videoUploader,
          mediaEnabled: !!mediaEnabled,
        }),
      ]
    : []),
  Color,
  TextStyle,
  Selection,
  Typography,
  UnsetAllMarks,
  HorizontalRule,
  ResetMarksOnEnter,
  CodeBlockLowlight,
  Placeholder.configure({ placeholder: () => placeholder }),
  Gallery.configure({
    businessId,
    galleriesEnabled: galleriesEnabled !== false,
  }),
  Embed.configure({ embedsEnabled: embedsEnabled !== false }),
  QuoteCalculator.configure({
    businessId,
    quotesEnabled: quotesEnabled !== false,
  }),
  Form.configure({ formsEnabled: formsEnabled !== false }),
  TableKit.configure({}),
];

export const useMinimalTiptapEditor = ({
  value,
  output = "html",
  placeholder = "",
  editorClassName,
  throttleDelay = 0,
  onUpdate,
  onBlur,
  uploader,
  videoUploader,
  mediaEnabled,
  businessId,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  formsEnabled,
  ...props
}: UseMinimalTiptapEditorProps) => {
  // const lastExternalValueRef = React.useRef<Content | undefined>(value);
  const lastEmittedContentRef = React.useRef<Content | undefined>(undefined);

  // const throttledSetValue = useThrottle(
  //   (value: Content) => onUpdate?.(value),
  //   throttleDelay,
  // );
  const throttledSetValue = useThrottle((content: Content) => {
    onUpdate?.(content);
    lastEmittedContentRef.current = content;
  }, throttleDelay);

  const handleUpdate = React.useCallback(
    (editor: Editor) => throttledSetValue(getOutput(editor, output)),
    [output, throttledSetValue],
  );

  // Keep initial value in a ref so handleCreate can be stable. Avoids useEditor
  // seeing a new onCreate every time form value (new ref) triggers a re-render.
  const initialValueRef = React.useRef(value);
  initialValueRef.current = value;
  // const handleCreate = React.useCallback((editor: Editor) => {
  //   const initial = initialValueRef.current;
  //   if (initial && editor.isEmpty) {
  //     editor.commands.setContent(initial);
  //   }
  // }, []);

  const handleBlur = React.useCallback(
    (editor: Editor) => onBlur?.(getOutput(editor, output)),
    [output, onBlur],
  );

  // Memoize extensions so useEditor doesn't recreate the editor on every render.
  // Unstable extension array is a common cause of "Maximum update depth" with Tiptap.
  const extensions = React.useMemo(
    () =>
      createExtensions({
        placeholder,
        uploader,
        videoUploader,
        mediaEnabled,
        businessId,
        galleriesEnabled,
        embedsEnabled,
        quotesEnabled,
        formsEnabled,
      }) as unknown as Extension[],
    [
      placeholder,
      uploader,
      videoUploader,
      mediaEnabled,
      businessId,
      galleriesEnabled,
      embedsEnabled,
      quotesEnabled,
      formsEnabled,
    ],
  );

  const editorProps = React.useMemo(
    () => ({
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        class: cn("focus:outline-hidden", editorClassName),
      },
    }),
    [editorClassName],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    editorProps,
    content: value,
    onUpdate: ({ editor }) => handleUpdate(editor),
    // onCreate: ({ editor }) => handleCreate(editor),
    onBlur: ({ editor }) => handleBlur(editor),
    ...props,
  });

  // React.useEffect(() => {
  //   if (!editor || value == null) return;
  //   const last = lastExternalValueRef.current;
  //   if (last === value) return;
  //   if (JSON.stringify(last) === JSON.stringify(value)) return;

  //   lastExternalValueRef.current = value;
  //   editor.commands.setContent(value);
  // }, [editor, value]);

  React.useEffect(() => {
    if (!editor || value == null) return;
    const lastEmitted = lastEmittedContentRef.current;
    if (JSON.stringify(lastEmitted) === JSON.stringify(value)) return;

    lastEmittedContentRef.current = value;
    editor.commands.setContent(value);
  }, [editor, value]);

  return editor;
};

export default useMinimalTiptapEditor;
