import type { Extension } from "@tiptap/core";
import type { Content, Editor, UseEditorOptions } from "@tiptap/react";
import * as React from "react";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Typography } from "@tiptap/extension-typography";
import { Placeholder, Selection } from "@tiptap/extensions";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { toast } from "sonner";

import type { FileError } from "../utils";
import { Column } from "~/lib/tiptap/columns-node";
import { DETAILS_EXTENSIONS } from "~/lib/tiptap/details-nodes";
import { DEFAULT_NEW_IMAGE_LAYOUT } from "~/lib/tiptap/image-node";
import { createLinkExtension } from "~/lib/tiptap/link-extension";
import { cn } from "~/lib/utils";
import { MAX_UPLOAD_SIZE } from "~/components/media/upload-dropzone";

import {
  CodeBlockLowlight,
  Color,
  EditorColumns,
  EditorSpacer,
  Embed,
  FileHandler,
  Form,
  Gallery,
  HorizontalRule,
  Image,
  LinkClickSelection,
  QuoteCalculator,
  ResetMarksOnEnter,
  TableKit,
  UnsetAllMarks,
  Video,
  VIDEO_ACCEPTED_MIME_TYPES,
  VIDEO_MAX_FILE_SIZE,
} from "../extensions";
import { useThrottle } from "../hooks/use-throttle";
import { fileToBase64, fillEmptyDoc, getOutput, randomId } from "../utils";

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
   * Adds "Choose from library" to the image and video dialogs. Only pass
   * `true` when the `media` feature flag is on.
   */
  mediaEnabled?: boolean;
  businessId?: string;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
  /**
   * Restricts the editor to what an email can show: no code, galleries,
   * embeds, forms, quote calculators, tables, columns, collapsible sections,
   * spacers or videos (none of those nodes are registered, so pasted content
   * flattens to text). Headings, lists, quotes, dividers, links, images,
   * alignment and colors stay. Used by the marketing campaign composer; the
   * content is rendered by `~/lib/marketing/tiptap-to-email`.
   */
  emailMode?: boolean;
  /**
   * Called with `true` when this editor's first image/video upload starts
   * and `false` when its last in-flight one settles (success or failure).
   * While an image uploads the doc holds a temporary `blob:` src that the
   * server drops on save, so Save buttons should wait for `false`. Combine
   * several editors with `useUploadingState`.
   */
  onUploadingChange?: (uploading: boolean) => void;
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

/**
 * Raw image size caps, checked before upload. With a real uploader the cap
 * is generous on purpose: `uploadRichTextImage` shrinks photos (max 2560px,
 * WebP) before the 5MB `/api/upload` limit applies, and throws a readable
 * error if the result is still too big. The base64 fallback can't shrink,
 * so it stays at the storage limit.
 */
const IMAGE_MAX_FILE_SIZE_FAKE = MAX_UPLOAD_SIZE.image;
const IMAGE_MAX_FILE_SIZE_REAL = 25 * 1024 * 1024;

const isVideoFile = (file: File) => file.type.startsWith("video/");

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`;

const fileLabel = (file: File | string) =>
  file instanceof File ? file.name : "That image";

/** One readable toast per rejected image (wrong type / too big). */
const toastImageFileError = (error: FileError, maxFileSize: number) => {
  const name = fileLabel(error.file);
  if (error.reason === "size") {
    toast.error(`${name} is too big`, {
      position: "bottom-right",
      description: `Images can be up to ${formatMb(maxFileSize)}.`,
    });
    return;
  }
  toast.error(`${name} isn't a supported image`, {
    position: "bottom-right",
    description: "Use a JPG, PNG, WebP, GIF or HEIC file.",
  });
};

/**
 * Uploads dropped/pasted images, then inserts them — at `pos` for drops, at
 * the selection for pastes — with the default new-image layout. Upload-first
 * like video (no `blob:` src in the doc); one toast tracks the batch, and a
 * failure says why instead of the drop silently doing nothing.
 */
const uploadAndInsertImages = async (
  editor: Editor,
  files: File[],
  upload: (file: File) => Promise<string>,
  pos?: number,
) => {
  if (files.length === 0) return;
  const toastId = toast.loading(
    files.length === 1
      ? `Uploading ${files[0]!.name}…`
      : `Uploading ${files.length} images…`,
    { position: "bottom-right" },
  );

  const results = await Promise.allSettled(files.map((file) => upload(file)));
  if (editor.isDestroyed) {
    toast.dismiss(toastId);
    return;
  }

  const nodes = results.flatMap((result) =>
    result.status === "fulfilled"
      ? [
          {
            type: "image",
            attrs: {
              ...DEFAULT_NEW_IMAGE_LAYOUT,
              id: randomId(),
              src: result.value,
            },
          },
        ]
      : [],
  );
  const failures = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          {
            name: files[index]!.name,
            message:
              result.reason instanceof Error
                ? result.reason.message
                : "Something went wrong.",
          },
        ]
      : [],
  );

  if (nodes.length > 0) {
    if (pos === undefined) {
      editor.commands.insertContent(nodes);
    } else {
      // The doc may have shrunk while the upload was in flight.
      editor.commands.insertContentAt(
        Math.min(pos, editor.state.doc.content.size),
        nodes,
      );
    }
  }

  if (failures.length === 0) {
    toast.success(
      nodes.length === 1 ? "Image added" : `${nodes.length} images added`,
      {
        id: toastId,
        position: "bottom-right",
      },
    );
    return;
  }
  toast.error(
    failures.length === 1
      ? `Couldn't upload ${failures[0]!.name}`
      : `Couldn't upload ${failures.length} images`,
    {
      id: toastId,
      position: "bottom-right",
      description:
        failures.length === 1
          ? failures[0]!.message
          : failures.map((f) => f.name).join(", "),
    },
  );
};

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

export const createExtensions = ({
  placeholder,
  uploader,
  fallbackUploader,
  videoUploader,
  mediaEnabled,
  businessId,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
  formsEnabled,
  emailMode,
}: {
  placeholder: string;
  uploader?: (file: File) => Promise<string>;
  /** Used instead of `fakeuploader` when no `uploader` is set (lets the hook count it). */
  fallbackUploader?: (file: File) => Promise<string>;
  videoUploader?: (file: File) => Promise<string>;
  mediaEnabled?: boolean;
  businessId?: string;
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
  formsEnabled?: boolean;
  emailMode?: boolean;
}) => {
  // When a real uploader is provided (e.g., S3), allow larger files since they'll
  // be compressed. Fall back to 5MB when using the fake base64 uploader.
  const imageMaxFileSize = uploader
    ? IMAGE_MAX_FILE_SIZE_REAL
    : IMAGE_MAX_FILE_SIZE_FAKE;

  return [
    StarterKit.configure({
      blockquote: { HTMLAttributes: { class: "block-node" } },
      // bold
      bulletList: { HTMLAttributes: { class: "list-node" } },
      code: emailMode
        ? false
        : { HTMLAttributes: { class: "inline", spellcheck: "false" } },
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
      // The shared link (below) replaces StarterKit's: same mark, plus the
      // button `variant` attr the storefront renders.
      link: false,
      orderedList: { HTMLAttributes: { class: "list-node" } },
      paragraph: { HTMLAttributes: { class: "text-node" } },
      // strike
      // text
      // underline
      // trailingNode
    }),
    createLinkExtension({
      enableClickSelection: true,
      openOnClick: false,
      HTMLAttributes: {
        class: "link",
      },
    }),
    // Selects the whole link from the clicked <a> (button links too, whose
    // padding leaves the caret outside the link); runs before Link's own.
    LinkClickSelection,
    Image.configure({
      allowedMimeTypes: ["image/*"],
      maxFileSize: imageMaxFileSize,
      allowBase64: true,
      mediaEnabled: !!mediaEnabled,
      uploadFn: async (file) => {
        return uploader
          ? await uploader(file)
          : await (fallbackUploader ?? fakeuploader)(file);
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
                ...DEFAULT_NEW_IMAGE_LAYOUT,
                id,
                src: blobUrl,
                fileName: image.name,
              },
            };
          }),
        );
      },
      onValidationError(errors) {
        errors.forEach((error) => toastImageFileError(error, imageMaxFileSize));
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
      maxFileSize: imageMaxFileSize,
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
        // Prefer the configured uploader (S3) so dropped images don't end
        // up base64-encoded in the document. Base64 is a last-resort
        // fallback for when no uploader is configured at all.
        void uploadAndInsertImages(
          editor,
          files.filter((file) => !isVideoFile(file)),
          uploader ?? fileToBase64,
          pos,
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
        // Same rationale as onDrop above — use the real uploader when set.
        void uploadAndInsertImages(
          editor,
          files.filter((file) => !isVideoFile(file)),
          uploader ?? fileToBase64,
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
          toastImageFileError(error, imageMaxFileSize);
        });
      },
    }),
    ...(videoUploader && !emailMode
      ? [
          Video.configure({
            uploadFn: videoUploader,
            mediaEnabled: !!mediaEnabled,
          }),
        ]
      : []),
    Color,
    TextStyle,
    // Same config as the storefront renderer, so stored alignment survives.
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Selection,
    Typography,
    UnsetAllMarks,
    HorizontalRule,
    ResetMarksOnEnter,
    Placeholder.configure({ placeholder: () => placeholder }),
    ...(emailMode
      ? []
      : [
          CodeBlockLowlight,
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
          // Layout containers, shared with the storefront renderer's schema so
          // `normalize-content`'s schema (built from this list) knows them too.
          EditorColumns,
          Column,
          ...DETAILS_EXTENSIONS,
          EditorSpacer,
        ]),
  ];
};

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
  emailMode,
  onUploadingChange,
  ...props
}: UseMinimalTiptapEditorProps) => {
  // Count this editor's in-flight uploads. The callback is read through a
  // ref so a new identity never rebuilds the uploaders (which key the
  // extensions memo below and would recreate the editor).
  const pendingUploadsRef = React.useRef(0);
  const onUploadingChangeRef = React.useRef(onUploadingChange);
  onUploadingChangeRef.current = onUploadingChange;
  const countUploads = React.useCallback(
    (fn: ((file: File) => Promise<string>) | undefined) =>
      fn
        ? async (file: File) => {
            pendingUploadsRef.current += 1;
            if (pendingUploadsRef.current === 1) {
              onUploadingChangeRef.current?.(true);
            }
            try {
              return await fn(file);
            } finally {
              pendingUploadsRef.current -= 1;
              if (pendingUploadsRef.current === 0) {
                onUploadingChangeRef.current?.(false);
              }
            }
          }
        : undefined,
    [],
  );
  const countedUploader = React.useMemo(
    () => countUploads(uploader),
    [countUploads, uploader],
  );
  const countedVideoUploader = React.useMemo(
    () => countUploads(videoUploader),
    [countUploads, videoUploader],
  );
  // Editors without an `uploader` still hold a `blob:` image for the
  // fallback's duration, so count that too.
  const countedFallbackUploader = React.useMemo(
    () => countUploads(fakeuploader),
    [countUploads],
  );

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
        uploader: countedUploader,
        fallbackUploader: countedFallbackUploader,
        videoUploader: countedVideoUploader,
        mediaEnabled,
        businessId,
        galleriesEnabled,
        embedsEnabled,
        quotesEnabled,
        formsEnabled,
        emailMode,
      }) as unknown as Extension[],
    [
      placeholder,
      countedUploader,
      countedFallbackUploader,
      countedVideoUploader,
      mediaEnabled,
      businessId,
      galleriesEnabled,
      embedsEnabled,
      quotesEnabled,
      formsEnabled,
      emailMode,
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
    // A childless doc leaves the editor with no textblock to put the
    // selection in until it's clicked; see `fillEmptyDoc`.
    content: fillEmptyDoc(value),
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
    // Value-driven sync (mount, Reset, setValue, templates) must not echo back
    // through onUpdate: TipTap would hand the form its schema-normalized JSON
    // (empty doc → one empty paragraph) and mark an untouched form dirty.
    editor.commands.setContent(fillEmptyDoc(value), { emitUpdate: false });
  }, [editor, value]);

  return editor;
};

export default useMinimalTiptapEditor;
