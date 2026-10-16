/* eslint-disable @next/next/no-img-element */
import type { Editor, NodeViewProps } from "@tiptap/react";
import * as React from "react";
import { InfoCircledIcon, TrashIcon } from "@radix-ui/react-icons";
import { NodeViewWrapper } from "@tiptap/react";
import { Controlled as ControlledZoom } from "react-medium-image-zoom";
import { toast } from "sonner";

import type { UploadReturnType } from "../image";
import type { ImageAlign, ImageSize } from "~/lib/tiptap/image-node";
import {
  coerceImageAlign,
  coerceImageSize,
  IMAGE_SIZE_LABEL,
  IMAGE_SIZE_PERCENT,
  isBuggedLegacyImageWidth,
} from "~/lib/tiptap/image-node";
import { cn } from "~/lib/utils";

import { blobUrlToBase64, randomId } from "../../../utils";
import { useSnapResize } from "../hooks/use-drag-resize";
import { useImageActions } from "../hooks/use-image-actions";
import { ActionButton, ActionWrapper, ImageActions } from "./image-actions";
import { ImageOverlay } from "./image-overlay";
import { ResizeHandle } from "./resize-handle";

/** Placeholder height while an image is loading or has failed. */
const PLACEHOLDER_HEIGHT = 120;

type NaturalSize = { width: number; height: number };

const normalizeUploadResponse = (res: UploadReturnType) => ({
  src: typeof res === "string" ? res : res.src,
  id: typeof res === "string" ? randomId() : res.id,
});

const toPositiveNumber = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
};

const readSrc = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "src" in value) {
    const src = (value as { src: unknown }).src;
    return typeof src === "string" ? src : "";
  }
  return "";
};

const ALIGN_MARGIN: Record<ImageAlign, React.CSSProperties> = {
  left: { marginLeft: 0, marginRight: "auto" },
  center: { marginLeft: "auto", marginRight: "auto" },
  right: { marginLeft: "auto", marginRight: 0 },
};

/**
 * Editor node view for a rich-text image.
 *
 * Layout mirrors the storefront (`~/lib/tiptap/image-node`): a `size` preset
 * is a share of the image's own column (the node view wrapper spans it, in a
 * columns row as in the editor body), and `align` sets the side margins.
 * Legacy images (pixel `width`, no `size`) keep showing at that pixel width,
 * centred, as they always have — except the old editor's accidental 120px
 * default, which shows unsized like the storefront does. Dragging a handle snaps to the nearest
 * preset on release and clears the pixel pair.
 *
 * Nothing is written to the node just by opening the doc: the image's
 * natural size is kept in local state only, so an untouched page stays clean.
 */
export const ImageViewBlock: React.FC<NodeViewProps> = ({
  editor,
  node,
  selected,
  updateAttributes,
  deleteNode,
}) => {
  const src = readSrc(node.attrs.src);
  const fileName = (node.attrs.fileName as string | null) ?? null;
  const size = coerceImageSize(node.attrs.size);
  const align = coerceImageAlign(node.attrs.align);
  const legacyWidth =
    size || isBuggedLegacyImageWidth(node.attrs.width)
      ? null
      : toPositiveNumber(node.attrs.width);
  // Legacy images were always shown centred in the editor.
  const effectiveAlign: ImageAlign = align ?? "center";

  const columnRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const uploadedSrcRef = React.useRef<string | null>(null);

  const [natural, setNatural] = React.useState<NaturalSize | null>(null);
  // Keyed by src so a replaced/uploaded image resets these without an effect.
  const [loadedSrc, setLoadedSrc] = React.useState<string | null>(null);
  const [everLoaded, setEverLoaded] = React.useState(false);
  const [errorSrc, setErrorSrc] = React.useState<string | null>(null);
  const [uploadingSrc, setUploadingSrc] = React.useState<string | null>(null);
  const [isZoomed, setIsZoomed] = React.useState(false);

  const isUploading = uploadingSrc === src;
  // A local preview the browser can't draw (e.g. HEIC) isn't an error while
  // the uploader is converting it; the uploaded URL replaces it.
  const hasError = errorSrc === src && !isUploading;
  // After the first load, keep showing the image while a new src (e.g. the
  // uploaded URL replacing the blob preview) loads, instead of blinking out.
  const isVisible = (loadedSrc === src || everLoaded) && !hasError;

  const onCommitSize = React.useCallback(
    (next: ImageSize) => {
      updateAttributes({
        size: next,
        align: effectiveAlign,
        width: null,
        height: null,
      });
    },
    [effectiveAlign, updateAttributes],
  );

  const {
    startResize,
    isResizing,
    activeDirection,
    dragWidth,
    previewSize,
    previewPercent,
  } = useSnapResize({
    frameRef,
    columnRef,
    align: effectiveAlign,
    onCommit: onCommitSize,
  });

  const { isLink, onView, onDownload, onCopy, onCopyLink } = useImageActions({
    editor,
    node,
    src,
    onViewClick: setIsZoomed,
  });

  const handleImageLoad = React.useCallback(
    (ev: React.SyntheticEvent<HTMLImageElement>) => {
      const img = ev.currentTarget;
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setLoadedSrc(img.getAttribute("src"));
      setEverLoaded(true);
    },
    [],
  );

  const handleImageError = React.useCallback(
    (ev: React.SyntheticEvent<HTMLImageElement>) => {
      setErrorSrc(ev.currentTarget.getAttribute("src"));
    },
    [],
  );

  // A `blob:` src is a just-inserted local file: upload it through the
  // extension's `uploadFn`, then swap in the stored URL.
  React.useEffect(() => {
    if (!src.startsWith("blob:") || uploadedSrcRef.current === src) return;
    uploadedSrcRef.current = src;

    const imageExtension = editor.extensionManager.extensions.find(
      (ext) => ext.name === "image",
    );
    const { uploadFn } =
      (imageExtension?.options as {
        uploadFn?: (file: File, editor: Editor) => Promise<UploadReturnType>;
      }) ?? {};

    const upload = async () => {
      setUploadingSrc(src);
      try {
        if (!uploadFn) {
          const base64 = await blobUrlToBase64(src);
          updateAttributes({ src: base64 });
          return;
        }
        const response = await fetch(src);
        const blob = await response.blob();
        const file = new File([blob], fileName ?? "image", {
          type: blob.type,
        });
        const result = await uploadFn(file, editor);
        updateAttributes(normalizeUploadResponse(result));
      } catch (error) {
        setErrorSrc(src);
        toast.error("Image upload failed", {
          position: "bottom-right",
          description:
            error instanceof Error ? error.message : "Something went wrong.",
        });
      } finally {
        setUploadingSrc((current) => (current === src ? null : current));
      }
    };

    void upload();
  }, [editor, fileName, src, updateAttributes]);

  let frameWidth: number | string | undefined;
  if (dragWidth != null) frameWidth = dragWidth;
  else if (size) frameWidth = `${IMAGE_SIZE_PERCENT[size]}%`;
  else if (legacyWidth) frameWidth = legacyWidth;
  else if (natural) frameWidth = natural.width;

  const showResizeHandles =
    editor.isEditable && isVisible && !hasError && !isUploading;
  const shouldMerge =
    size === "small" ||
    (!size && (legacyWidth ?? natural?.width ?? 999) <= 180);

  return (
    <NodeViewWrapper
      ref={columnRef}
      data-drag-handle
      className="relative leading-none"
    >
      <div
        ref={frameRef}
        className="group/node-image relative max-w-full rounded-md"
        style={{
          width: frameWidth,
          ...ALIGN_MARGIN[effectiveAlign],
          // The image's own `height: auto` sizes the frame once drawn; until
          // then (or if it fails) keep room for the spinner / error.
          ...(isVisible ? {} : { minHeight: PLACEHOLDER_HEIGHT }),
        }}
      >
        <div
          className={cn("relative h-full cursor-default rounded", {
            "outline-primary outline-2 outline-offset-2":
              selected || isResizing,
          })}
        >
          <ControlledZoom
            isZoomed={isZoomed}
            onZoomChange={() => setIsZoomed(false)}
          >
            <img
              className={cn("block h-auto w-full rounded object-contain", {
                "opacity-0": !isVisible,
              })}
              src={src}
              onError={handleImageError}
              onLoad={handleImageLoad}
              alt={(node.attrs.alt as string | null) ?? ""}
              title={(node.attrs.title as string | null) ?? undefined}
              id={(node.attrs.id as string | null) ?? undefined}
              draggable={false}
            />
          </ControlledZoom>

          {isUploading && !hasError && <ImageOverlay />}

          {hasError && (
            <div className="bg-muted/60 absolute inset-0 flex flex-col items-center justify-center rounded">
              <InfoCircledIcon className="text-destructive size-8" />
              <p className="text-muted-foreground mt-2 text-sm">
                {src.startsWith("blob:")
                  ? "Upload failed"
                  : "Failed to load image"}
              </p>
            </div>
          )}

          {isResizing && previewSize && (
            <div
              aria-hidden="true"
              className="bg-popover text-popover-foreground pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap shadow-sm"
            >
              {IMAGE_SIZE_LABEL[previewSize]} · {previewPercent}%
            </div>
          )}

          {showResizeHandles && (
            <>
              <ResizeHandle
                onPointerDown={startResize("left")}
                className={cn("-left-1", {
                  hidden: isResizing && activeDirection === "right",
                })}
                visible={selected}
                isResizing={isResizing && activeDirection === "left"}
              />
              <ResizeHandle
                onPointerDown={startResize("right")}
                className={cn("-right-1", {
                  hidden: isResizing && activeDirection === "left",
                })}
                visible={selected}
                isResizing={isResizing && activeDirection === "right"}
              />
            </>
          )}

          {hasError && editor.isEditable && (
            <ActionWrapper className="opacity-100">
              <ActionButton
                icon={<TrashIcon />}
                tooltip="Remove image"
                onClick={() => deleteNode()}
              />
            </ActionWrapper>
          )}

          {!isResizing && !hasError && !isUploading && isVisible && (
            <ImageActions
              shouldMerge={shouldMerge}
              isLink={isLink}
              onView={onView}
              onDownload={onDownload}
              onCopy={onCopy}
              onCopyLink={onCopyLink}
            />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};
