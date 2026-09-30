"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";

/**
 * Collapsed height as a fraction of the viewport: the form below, the section
 * still visible above. The compact editor pads its preview by the same
 * amount (`pb-[55dvh]`) — keep the two in sync.
 */
export const SHEET_SNAP_LOW = 0.55;
/** Expanded fallback when the viewport height isn't known (SSR). */
const SHEET_SNAP_HIGH_FALLBACK = 0.95;

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** Text-entry targets that should pull the sheet up before the keyboard opens. */
function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return ![
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit",
    ].includes(el.type);
  }
  return false;
}

export type CompactEditSheetProps = {
  open: boolean;
  /** Accessible name for the sheet (screen-reader only). */
  title: string;
  /** Controlled: expanded (top snap) vs. collapsed (`SHEET_SNAP_LOW`). */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /**
   * Pixels kept clear at the top when expanded — the editor's top bar, so
   * Publish / the page picker stay reachable at full height.
   */
  topInset: number;
  /** Swipe-down / Escape / handle-tap-at-top — close the active panel. */
  onDismiss: () => void;
  children: React.ReactNode;
};

/**
 * Compact-editor bottom sheet hosting whichever contextual panel is active.
 *
 * - NON-modal: the preview above stays live and tappable (tap another section
 *   to swap the panel in place). Vaul's non-modal mode already ignores
 *   pointer-down / focus outside the sheet, so interacting with portaled
 *   Radix layers opened FROM the sheet (Select, Popover, DropdownMenu, the
 *   media picker Dialog) or with the iframe never dismisses it. It closes only
 *   via the panel's own X, a swipe down on the handle, or Escape.
 * - `handleOnly`: only the grab handle drags. Panels are forms — without this
 *   vaul claims every vertical drag while the sheet sits below its top snap
 *   point (so the body could never scroll), and it pointer-captures every
 *   press, which fights inputs, Selects and the rich-text editor.
 * - The content is a full-viewport-tall box that vaul translates down to the
 *   active snap point; the inner wrapper is sized to just the VISIBLE part
 *   (`100% - --snap-point-height`, a var vaul sets on the content) so the
 *   panel body's scroll range ends at the screen edge at either snap.
 * - `repositionInputs={false}`: vaul's keyboard handling resizes the content
 *   box, which breaks the visible-height math above. Instead the sheet jumps
 *   to the top snap whenever a text field gains focus.
 * - The top snap is a px value (`viewport - topInset`) re-derived on resize.
 *   Vaul matches the active snap point by identity, so the parent holds a
 *   boolean and this component maps it onto whatever the values are now.
 */
export function CompactEditSheet({
  open,
  title,
  expanded,
  onExpandedChange,
  topInset,
  onDismiss,
  children,
}: CompactEditSheetProps) {
  const viewportHeight = useSyncExternalStore(
    subscribeResize,
    () => window.innerHeight,
    () => 0,
  );
  const highSnap: number | string =
    viewportHeight > topInset * 4
      ? `${viewportHeight - topInset}px`
      : SHEET_SNAP_HIGH_FALLBACK;
  const snapPoints = useMemo(() => [SHEET_SNAP_LOW, highSnap], [highSnap]);

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
      snapPoints={snapPoints}
      activeSnapPoint={expanded ? highSnap : SHEET_SNAP_LOW}
      setActiveSnapPoint={(point) => onExpandedChange(point === highSnap)}
      modal={false}
      handleOnly
      noBodyStyles
      repositionInputs={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Content
          aria-describedby={undefined}
          onFocus={(event) => {
            if (!expanded && isTextEntry(event.target)) {
              onExpandedChange(true);
            }
          }}
          // z-40: below Radix popovers/dialogs (z-50) opened from inside it.
          className="bg-card fixed inset-x-0 bottom-0 z-40 flex h-dvh flex-col rounded-t-xl border-t shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] outline-none sm:mx-auto sm:max-w-2xl sm:border-x"
        >
          <DrawerPrimitive.Title className="sr-only">
            {title}
          </DrawerPrimitive.Title>
          <div
            className="flex min-h-0 flex-col transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ height: "calc(100% - var(--snap-point-height, 0px))" }}
          >
            <div className="relative flex h-8 shrink-0 items-center justify-center">
              <button
                type="button"
                onClick={() => onExpandedChange(!expanded)}
                aria-label={expanded ? "Shrink editor" : "Expand editor"}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <DrawerPrimitive.Handle />
            </div>
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
