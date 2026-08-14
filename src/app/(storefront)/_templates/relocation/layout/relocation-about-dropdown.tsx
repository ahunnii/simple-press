"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import { isActiveNavLink } from "~/lib/nav-utils";
import { cn } from "~/lib/utils";

export type RelocationDropdownLink = {
  href: string;
  label: string;
  external?: boolean;
};

/**
 * The header's "About Us ▾" menu — any owner nav item that has children (the
 * shipped default being About Us → Backstory / Reviews / FAQ). The clone
 * shipped a `aria-expanded="false"` button with no panel and no handler; per
 * design.md deviation #2 this is a real click-toggled menu. The parent item's
 * own `href` is deliberately unused: the trigger only opens the panel, which
 * is the platform's dropdown convention across headers.
 *
 * Keyboard contract (WAI-ARIA APG menu-button):
 *  - Enter/Space/click toggles; ArrowDown opens and focuses the first item.
 *  - ArrowUp/ArrowDown move between items, Home/End jump to the ends.
 *  - Escape closes and returns focus to the trigger.
 *  - Tab out or a click outside closes without stealing focus.
 */
export function RelocationAboutDropdown({
  label,
  links,
  activePath,
}: {
  label: string;
  links: RelocationDropdownLink[];
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
        className={cn(
          "relocation-hover-fade relocation-nav-link inline-flex cursor-pointer items-center gap-1.5 py-1 [font-family:var(--font-relocation-display)] text-[1.0625rem] leading-6 text-[var(--relocation-ink)]",
          isActive && "relocation-nav-link--active",
        )}
      >
        <span>{label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 8"
          width={12}
          height={8}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("relocation-dropdown-chevron block", open && "is-open")}
        >
          <path d="M1 1.5 6 6.5 11 1.5" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute top-full right-0 z-50 mt-3 min-w-[13rem] rounded-[var(--relocation-radius)] border border-solid border-[var(--relocation-border)] bg-[var(--relocation-paper)] py-2 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
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
              className="relocation-hover-fade block px-5 py-2.5 [font-family:var(--font-relocation-display)] text-[1.0625rem] leading-6 text-[var(--relocation-ink)]"
            >
              {link.label}
              {link.external && (
                <span className="sr-only">(opens in new tab)</span>
              )}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
