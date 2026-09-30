"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { NavChild } from "~/app/(storefront)/_components/nav";
import { cn } from "~/lib/utils";
import { externalLinkProps } from "~/app/(storefront)/_components/nav";

/** Grace period before a hover-opened panel closes, so the pointer can cross
 *  the gap between trigger and panel (or wobble off an edge) without the
 *  panel snapping shut. */
const HOVER_CLOSE_DELAY_MS = 150;

/**
 * Desktop menu for an owner nav item that carries `children` — the one level
 * `navigationItemsSchema` (`src/lib/validators/content.ts`) allows. `entries`
 * comes from `navGroupEntries`, so a parent with its own href lists that
 * destination first; the trigger itself only opens the panel.
 *
 * Opens on mouse hover (closing after a short delay once the pointer leaves
 * the trigger + panel) as well as on click and keyboard. Keyboard contract
 * (WAI-ARIA APG menu-button), same as `relocation-about-dropdown.tsx`:
 *  - Enter/Space/click toggles; ArrowDown opens and focuses the first item.
 *  - ArrowUp/ArrowDown move between items, Home/End jump to the ends.
 *  - Escape closes and returns focus to the trigger.
 *  - Tab out or a click outside closes without stealing focus.
 *
 * Current-page state: only the matching entry carries `aria-current="page"`,
 * so exactly one nav element is ever announced as current. The trigger marks
 * its group with `data-current` and takes the same rose colour a current
 * top-level link gets from `.pink-nav-link[aria-current="page"]`.
 */
export function PinkNavDropdown({
  label,
  entries,
  activeEntry,
}: {
  label: string;
  /** `navGroupEntries(item)` — the parent's own link first, then children. */
  entries: NavChild[];
  /** Index into `entries` of the current page, or -1. */
  activeEntry: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when hover opened the panel, so the click that often follows (the
  // shopper clicks the label they're pointing at) keeps it open instead of
  // toggling it shut under the pointer.
  const openedByHover = useRef(false);
  const menuId = useId();

  const isCurrent = activeEntry !== -1;

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => cancelClose, []);

  // Click / focus outside closes the panel.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  // Hover is mouse-only: a touch tap also fires pointerenter, and letting it
  // open the panel would fight the tap's own click toggle.
  const onPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    if (!open) {
      openedByHover.current = true;
      setOpen(true);
    }
  };

  const onPointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      openedByHover.current = false;
      // Keep it open while KEYBOARD focus is inside — leaving with the mouse
      // shouldn't yank the panel from under a keyboard user. A mouse click's
      // focus isn't `:focus-visible`, so a clicked trigger still closes.
      const focused = document.activeElement;
      if (
        focused &&
        rootRef.current?.contains(focused) &&
        focused.matches(":focus-visible")
      ) {
        return;
      }
      setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  };

  const focusItem = (index: number) => {
    const count = entries.length;
    if (count === 0) return;
    const next = ((index % count) + count) % count;
    itemRefs.current[next]?.focus();
  };

  const openAndFocus = (index: number) => {
    cancelClose();
    setOpen(true);
    // The panel mounts in this same commit; focus on the next frame.
    requestAnimationFrame(() => focusItem(index));
  };

  const onTriggerClick = () => {
    cancelClose();
    if (openedByHover.current) {
      openedByHover.current = false;
      setOpen(true);
      return;
    }
    setOpen((value) => !value);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAndFocus(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAndFocus(entries.length - 1);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const onItemKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(entries.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-current={isCurrent ? "true" : undefined}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
        className="pink-nav-link inline-flex cursor-pointer items-center gap-1"
        style={isCurrent ? { color: "var(--pink-rose)" } : undefined}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        // `pt-3` (not a margin) spaces the panel off the trigger, so the
        // pointer never crosses a gap outside this wrapper on its way down.
        <div className="absolute top-full left-0 z-50 pt-3">
          <div
            id={menuId}
            role="menu"
            aria-label={label}
            className="flex min-w-[12rem] flex-col py-1"
            style={{
              background: "var(--pink-paper)",
              // Pink paints no shadows anywhere, so a floating panel has to
              // read as its own surface off the border alone — `--pink-line`
              // is a decorative hairline and disappears over page content, so
              // this uses the structural button border (3.36:1 on white).
              border: "1px solid var(--pink-line-button)",
            }}
          >
            {entries.map((entry, index) => (
              <Link
                key={entry.href + entry.label}
                href={entry.href}
                role="menuitem"
                {...externalLinkProps(entry.external)}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                onClick={() => {
                  cancelClose();
                  setOpen(false);
                }}
                onKeyDown={(event) => onItemKeyDown(event, index)}
                aria-current={index === activeEntry ? "page" : undefined}
                className="pink-nav-link block px-4 py-2.5 whitespace-nowrap"
              >
                {entry.label}
                {entry.external && (
                  <span className="sr-only"> (opens in new tab)</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
