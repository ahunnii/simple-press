import * as React from "react";

import { cn } from "~/lib/utils";

interface ResizeProps extends React.ComponentProps<"div"> {
  /** Shown at full strength while the image is selected or being resized. */
  visible?: boolean;
  isResizing?: boolean;
}

/**
 * A pill-shaped drag handle on the image's left/right edge. Hidden until the
 * image is hovered; always shown while the image is selected, so owners can
 * find it without hunting. The `before:` pseudo widens the hit area.
 */
export const ResizeHandle = ({
  ref,
  className,
  visible = false,
  isResizing = false,
  ...props
}: ResizeProps) => {
  return (
    <div
      aria-hidden="true"
      data-image-resize-handle=""
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      className={cn(
        "absolute top-1/2 z-10 h-12 max-h-[80%] min-h-6 w-2.5 -translate-y-1/2 cursor-col-resize touch-none rounded-full",
        "border-background bg-primary border-2 shadow-md transition-opacity",
        "before:absolute before:-inset-x-2 before:inset-y-0 before:content-['']",
        isResizing || visible
          ? "opacity-100"
          : "opacity-0 group-hover/node-image:opacity-80",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
};

ResizeHandle.displayName = "ResizeHandle";
