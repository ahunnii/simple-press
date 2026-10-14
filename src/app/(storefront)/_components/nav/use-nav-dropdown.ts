"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type RefObject,
} from "react";

/**
 * Desktop nav-dropdown state machine shared by the storefront headers. A custom
 * disclosure, not Radix — a portaled menu would escape the template's scoped
 * CSS (and its focus-visible styling). Extracted from pollen-header so every
 * header gets the same behavior: one group open at a time, hover + click +
 * keyboard, Escape / outside-pointer / route-change close.
 *
 * Lives in its own file (not the nav barrel) because the barrel is React-free
 * and imported by server components — import this hook by its path.
 *
 * @param pathname  current route; a change closes the open panel
 * @param idPrefix  template-unique prefix for panel ids (`${idPrefix}-dropdown-${i}`)
 */
export function useNavDropdown(pathname: string, idPrefix: string) {
  // Index of the open dropdown group (one at a time).
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const containerRef: RefObject<HTMLElement | null> =
    useRef<HTMLElement | null>(null);
  // Set when hover (or a touch tap's emulated mouseenter) opened the group,
  // so the click that usually follows doesn't immediately toggle it shut.
  const openedByHover = useRef(false);

  // Close the dropdown on route change (back/forward, programmatic pushes).
  // Adjusting state during render on a changed input, per the React docs.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenIndex(null);
  }

  // Escape closes the open dropdown and returns focus to its trigger; a
  // pointer-down outside the desktop nav closes it too.
  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = triggerRefs.current.get(openIndex);
      setOpenIndex(null);
      trigger?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpenIndex(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openIndex]);

  const panelId = (i: number) => `${idPrefix}-dropdown-${i}`;

  return {
    openIndex,
    close: () => setOpenIndex(null),
    /** ref for the desktop <nav>/<ul> wrapping all groups — pointer-down outside it closes the open panel */
    containerRef,
    /** spread on the wrapper element around one group's trigger + panel (hover bridge lives here) */
    groupProps: (i: number) => ({
      onMouseEnter: () => {
        if (openIndex !== i) openedByHover.current = true;
        setOpenIndex(i);
      },
      onMouseLeave: () => {
        openedByHover.current = false;
        setOpenIndex(null);
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        // Close once focus leaves the trigger + panel entirely.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpenIndex((current) => (current === i ? null : current));
        }
      },
    }),
    /** spread on the group's <button> trigger */
    triggerProps: (i: number) => ({
      ref: (el: HTMLButtonElement | null) => {
        if (el) triggerRefs.current.set(i, el);
        else triggerRefs.current.delete(i);
      },
      type: "button" as const,
      "aria-haspopup": "true" as const,
      "aria-expanded": openIndex === i,
      "aria-controls": panelId(i),
      onClick: () => {
        const keepOpen = openedByHover.current;
        openedByHover.current = false;
        setOpenIndex(openIndex === i && !keepOpen ? null : i);
      },
    }),
    /** id to put on the panel element for group i (matches aria-controls) */
    panelId,
  };
}
