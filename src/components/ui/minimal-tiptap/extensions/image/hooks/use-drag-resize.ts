import { useCallback, useEffect, useRef, useState } from "react";

import type { ImageAlign, ImageSize } from "~/lib/tiptap/image-node";
import { IMAGE_SIZE_PERCENT, nearestImageSize } from "~/lib/tiptap/image-node";

export type ResizeDirection = "left" | "right";

/** Smallest width a drag can shrink to, as a share of the column. */
const MIN_FRACTION = 0.12;

type DragState = {
  direction: ResizeDirection;
  originX: number;
  startWidth: number;
  columnWidth: number;
};

type HookParams = {
  /** The element whose width is being dragged (the image frame). */
  frameRef: React.RefObject<HTMLElement | null>;
  /**
   * The full-width block the frame sits in (the node view wrapper), i.e.
   * the image's own column: in a columns row that's the column, otherwise
   * the editor body. Size presets are shares of this width.
   */
  columnRef: React.RefObject<HTMLElement | null>;
  /** Centered images grow from both sides, so the pointer delta counts twice. */
  align: ImageAlign;
  /** Called once on release with the nearest preset. Not called on Escape. */
  onCommit: (size: ImageSize) => void;
};

/**
 * Drag-to-resize for rich-text images that snaps to the size presets.
 *
 * While dragging, the frame follows the pointer in pixels (`dragWidth`) and
 * `previewSize` names the preset a release would pick; on release the
 * nearest preset is committed and the pixel width is discarded, so a saved
 * image is always "a share of its column" and adapts to columns and phones.
 * Escape cancels the drag without writing anything.
 */
export function useSnapResize({
  frameRef,
  columnRef,
  align,
  onCommit,
}: HookParams) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const dragWidthRef = useRef<number | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const reset = useCallback(() => {
    setDrag(null);
    setDragWidth(null);
    dragWidthRef.current = null;
  }, []);

  const startResize = useCallback(
    (direction: ResizeDirection) =>
      (event: React.PointerEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const frame = frameRef.current;
        const column = columnRef.current;
        if (!frame || !column) return;
        const columnWidth = column.getBoundingClientRect().width;
        const startWidth = frame.getBoundingClientRect().width;
        if (columnWidth <= 0) return;
        dragWidthRef.current = startWidth;
        setDragWidth(startWidth);
        setDrag({
          direction,
          originX: event.clientX,
          startWidth,
          columnWidth,
        });
      },
    [frameRef, columnRef],
  );

  useEffect(() => {
    if (!drag) return;
    const factor = align === "center" ? 2 : 1;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const delta =
        drag.direction === "right"
          ? event.clientX - drag.originX
          : drag.originX - event.clientX;
      const next = Math.min(
        drag.columnWidth,
        Math.max(
          drag.columnWidth * MIN_FRACTION,
          drag.startWidth + delta * factor,
        ),
      );
      dragWidthRef.current = next;
      setDragWidth(next);
    };

    const handleUp = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const width = dragWidthRef.current;
      reset();
      if (width == null) return;
      onCommitRef.current(nearestImageSize((width / drag.columnWidth) * 100));
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      reset();
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("keydown", handleKeydown, true);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("keydown", handleKeydown, true);
    };
  }, [drag, align, reset]);

  const previewSize =
    drag && dragWidth != null
      ? nearestImageSize((dragWidth / drag.columnWidth) * 100)
      : null;

  return {
    startResize,
    isResizing: drag !== null,
    activeDirection: drag?.direction ?? null,
    /** Live pixel width while dragging, else `null`. */
    dragWidth,
    /** The preset a release would commit, while dragging. */
    previewSize,
    previewPercent: previewSize ? IMAGE_SIZE_PERCENT[previewSize] : null,
  };
}
