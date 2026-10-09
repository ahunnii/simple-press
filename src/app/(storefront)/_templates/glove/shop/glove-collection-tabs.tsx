"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";

export type GloveCollectionTab = { id: string | null; name: string };

/** "All products" + this many collections stay visible; the rest go in More. */
const VISIBLE_COLLECTIONS = 4;

type Props = {
  /** First entry is "All products" (`id: null`). */
  tabs: GloveCollectionTab[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  /** Field attrs for the "All products" label (live editor patch). */
  allLabelAttrs?: Record<string, string>;
};

const TAB_CLASS =
  "glove-display inline-flex min-h-12 items-center border-b-2 px-3 text-[15px] font-medium whitespace-nowrap transition-colors duration-150";

/**
 * The shop's collection filter: a strip under the banner band. Up to five
 * tabs ("All products" + four collections) stay visible; the rest live in a
 * "More" disclosure (Escape closes, arrow keys move through it). On phones
 * the tab row scrolls sideways with a right-edge fade while more is hidden.
 */
export function GloveCollectionTabs({
  tabs,
  activeId,
  onSelect,
  allLabelAttrs,
}: Props) {
  const visible = tabs.slice(0, VISIBLE_COLLECTIONS + 1);
  const overflow = tabs.slice(VISIBLE_COLLECTIONS + 1);
  const activeOverflow = overflow.find((t) => t.id === activeId);

  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Right-edge fade only while there is more row to scroll to.
  const scrollRef = useRef<HTMLUListElement>(null);
  const [fadeRight, setFadeRight] = useState(false);
  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);
  useEffect(() => {
    updateFade();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFade, tabs.length]);

  // Close on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll("button") ?? []);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = menuItems();
    if (items.length === 0) return;
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === "ArrowDown"
        ? items[(i + 1) % items.length]
        : items[(i - 1 + items.length) % items.length];
    next?.focus();
  };

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => menuItems()[0]?.focus());
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const choose = (id: string | null) => {
    onSelect(id);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <nav
      aria-label="Collections"
      className="border-b border-[var(--glove-line)] bg-[var(--glove-wash)]"
    >
      <div className="glove-container flex items-stretch gap-1">
        <ul
          ref={scrollRef}
          onScroll={updateFade}
          className={cn(
            "glove-tabs-scroll m-0 flex min-w-0 flex-1 list-none gap-1 overflow-x-auto p-0 [scrollbar-width:none]",
            fadeRight && "glove-tabs-scroll--fade",
          )}
        >
          {visible.map((tab) => {
            const active = tab.id === activeId;
            return (
              <li key={tab.id ?? "all"} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(tab.id)}
                  // Inset ring: the scrolling row clips an outer one.
                  style={{ outlineOffset: -3 }}
                  className={cn(
                    TAB_CLASS,
                    active
                      ? "border-[var(--glove-primary)] text-[var(--glove-primary)]"
                      : "border-transparent text-[var(--glove-nav)] hover:text-[var(--glove-primary)]",
                  )}
                >
                  <span {...(tab.id === null ? allLabelAttrs : {})}>
                    {tab.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {overflow.length > 0 ? (
          <div
            ref={wrapRef}
            className="relative shrink-0"
            // Tabbing out of the disclosure closes it.
            onBlur={(e) => {
              if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) {
                setOpen(false);
              }
            }}
          >
            <button
              ref={buttonRef}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
              onKeyDown={onButtonKeyDown}
              style={{ outlineOffset: -3 }}
              className={cn(
                TAB_CLASS,
                "gap-1",
                activeOverflow
                  ? "border-[var(--glove-primary)] text-[var(--glove-primary)]"
                  : "border-transparent text-[var(--glove-nav)] hover:text-[var(--glove-primary)]",
              )}
            >
              {activeOverflow ? activeOverflow.name : "More"}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform duration-150",
                  open && "rotate-180",
                )}
              />
            </button>
            {open ? (
              <ul
                ref={menuRef}
                id={menuId}
                onKeyDown={onMenuKeyDown}
                className="absolute top-full right-0 z-30 m-0 mt-1 flex max-h-[60vh] min-w-[220px] list-none flex-col overflow-y-auto rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-paper)] p-1.5 shadow-[var(--glove-shadow-md)]"
              >
                {overflow.map((tab) => {
                  const active = tab.id === activeId;
                  return (
                    <li key={tab.id ?? "all"}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(tab.id)}
                        className={cn(
                          "glove-display flex min-h-11 w-full items-center rounded-[var(--glove-radius-btn)] px-3 text-left text-[15px] font-medium transition-colors",
                          active
                            ? "bg-[var(--glove-mist)] text-[var(--glove-primary)]"
                            : "text-[var(--glove-nav)] hover:bg-[var(--glove-mist)] hover:text-[var(--glove-primary)]",
                        )}
                      >
                        {tab.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
