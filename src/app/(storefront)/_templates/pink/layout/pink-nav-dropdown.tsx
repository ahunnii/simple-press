"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { PinkNavChild } from "./pink-header";
import { isActiveNavLink } from "~/lib/nav-utils";
import { cn } from "~/lib/utils";

/**
 * Desktop menu for any owner nav item that carries `children` — the one level
 * `navigationItemsSchema` (`src/lib/validators/content.ts`) allows. The
 * parent's own `href` is TRIGGER-ONLY and is never navigated to, which is the
 * platform convention every other header follows (`default`, `relocation`).
 *
 * Keyboard contract (WAI-ARIA APG menu-button), same as
 * `relocation-about-dropdown.tsx`:
 *  - Enter/Space/click toggles; ArrowDown opens and focuses the first item.
 *  - ArrowUp/ArrowDown move between items, Home/End jump to the ends.
 *  - Escape closes and returns focus to the trigger.
 *  - Tab out or a click outside closes without stealing focus.
 *
 * The trigger deliberately does NOT carry `aria-current` even when one of its
 * children is the current page — only the matching child link does, so exactly
 * one nav element is ever announced as current. That costs the trigger pink's
 * `.pink-nav-link[aria-current="page"]` colour rule, so its active state is an
 * inline colour swap instead.
 */
export function PinkNavDropdown({
  label,
  links,
  activePath,
}: {
  label: string;
  links: PinkNavChild[];
  activePath: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuId = useId();

  const isActive = links.some((link) => isActiveNavLink(activePath, link.href));

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

  const focusItem = (index: number) => {
    const count = links.length;
    if (count === 0) return;
    const next = ((index % count) + count) % count;
    itemRefs.current[next]?.focus();
  };

  const openAndFocus = (index: number) => {
    setOpen(true);
    // The panel mounts in this same commit; focus on the next frame.
    requestAnimationFrame(() => focusItem(index));
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAndFocus(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAndFocus(links.length - 1);
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
        focusItem(links.length - 1);
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
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
        className="pink-nav-link inline-flex cursor-pointer items-center gap-1"
        style={isActive ? { color: "var(--pink-rose)" } : undefined}
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
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute top-full left-0 z-50 mt-3 flex min-w-[12rem] flex-col py-1"
          style={{
            background: "var(--pink-paper)",
            // Pink paints no shadows anywhere, so a floating panel has to read
            // as its own surface off the border alone — `--pink-line` (#ececec)
            // is a decorative hairline and disappears over page content, so this
            // uses the structural button border (3.36:1 on white) instead.
            border: "1px solid var(--pink-line-button)",
          }}
        >
          {links.map((link, index) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              role="menuitem"
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              onClick={() => setOpen(false)}
              onKeyDown={(event) => onItemKeyDown(event, index)}
              aria-current={
                isActiveNavLink(activePath, link.href) ? "page" : undefined
              }
              className="pink-nav-link block px-4 py-2.5 whitespace-nowrap"
            >
              {link.label}
              {link.external && (
                <span className="sr-only"> (opens in new tab)</span>
              )}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
