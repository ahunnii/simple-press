"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WealthImpactNavLink = { id: string; label: string };

type Props = {
  links: WealthImpactNavLink[];
  /** Report name shown at the left on wide screens (decorative). */
  label: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Sticky sage sub-nav for the Impact Report (ported from the mock's inline
 * script). Lists every section that actually rendered (one entry per
 * spotlight).
 *
 * - Square ‹ › step buttons (≥1100px, CSS) appear only while the strip
 *   overflows in that direction; each scrolls it by 70% of its width.
 *   Short menus sit right-aligned (`justify-content: safe flex-end`).
 *
 * - Scroll-spy: the last section whose top has passed a line just below the
 *   nav is current (`aria-current="true"`, forest underline in CSS); at the
 *   very bottom of the page the last section wins.
 * - Clicks scroll smoothly (instant under reduced motion), update the hash
 *   and move focus to the section (sections carry `tabIndex={-1}`).
 * - The active link is kept visible inside the nav's own horizontal scroller
 *   on phones. The page itself never scrolls sideways.
 * - Sticky offset (`--wealth-header-offset`) and section `scroll-margin-top`
 *   come from `.wealth-impact-nav` / `.wealth-impact-anchor` in globals.css.
 */
export function WealthImpactNav({ links, label }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(-1);
  // Step buttons start hidden (SSR + no-JS: the strip just scrolls natively).
  const [canStep, setCanStep] = useState({ back: false, forward: false });

  /** Show ‹ / › only while the list overflows in that direction. */
  const syncSteps = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    const next = {
      back: list.scrollLeft > 2,
      forward: list.scrollLeft < max - 2,
    };
    setCanStep((prev) =>
      prev.back === next.back && prev.forward === next.forward ? prev : next,
    );
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    syncSteps();
    list.addEventListener("scroll", syncSteps, { passive: true });
    window.addEventListener("resize", syncSteps);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncSteps)
        : null;
    observer?.observe(list);
    return () => {
      list.removeEventListener("scroll", syncSteps);
      window.removeEventListener("resize", syncSteps);
      observer?.disconnect();
    };
  }, [syncSteps, links]);

  const step = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * list.clientWidth * 0.7,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const update = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const line =
      nav.getBoundingClientRect().bottom +
      Math.min(window.innerHeight * 0.3, 180);
    let idx = -1;
    links.forEach((link, k) => {
      const el = document.getElementById(link.id);
      if (el && el.getBoundingClientRect().top <= line) idx = k;
    });
    const doc = document.documentElement;
    if (
      idx >= 0 &&
      window.innerHeight + window.scrollY >= doc.scrollHeight - 4
    ) {
      idx = links.length - 1;
    }
    setCurrent(idx);
  }, [links]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [update]);

  // Keep the active link in view inside the nav's horizontal scroller.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    if (current < 0) {
      // Above the first section: nothing is active, so rewind the strip.
      if (list.scrollLeft > 0) list.scrollTo({ left: 0, behavior });
      return;
    }
    const a = list.querySelectorAll<HTMLAnchorElement>("a")[current];
    if (!a) return;
    const left = a.offsetLeft;
    const right = left + a.offsetWidth;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({
        left: Math.max(0, left - (list.clientWidth - a.offsetWidth) / 2),
        behavior,
      });
    }
  }, [current]);

  const onClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    // Let the browser handle new-tab / new-window / download clicks.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    window.history.pushState(null, "", `#${id}`);
    target.focus({ preventScroll: true });
  };

  if (links.length === 0) return null;

  return (
    <nav
      ref={navRef}
      className="wealth-impact-nav wealth-on-sage"
      aria-label="Report sections"
    >
      <div className="wealth-container wealth-impact-nav__inner">
        {label ? (
          <p className="wealth-impact-nav__label" aria-hidden="true">
            {label}
          </p>
        ) : null}
        <button
          type="button"
          className="wealth-impact-nav__step"
          aria-label="Scroll section menu left"
          hidden={!canStep.back}
          onClick={() => step(-1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M10 3L5 8l5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </button>
        <ul ref={listRef} className="wealth-impact-nav__list">
          {links.map((link, k) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                aria-current={k === current ? "true" : undefined}
                onClick={(e) => onClick(e, link.id)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="wealth-impact-nav__step"
          aria-label="Scroll section menu right"
          hidden={!canStep.forward}
          onClick={() => step(1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M6 3l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}

/**
 * Footnote focus helper (renders nothing). A `[N]` superscript is a plain
 * `#impact-source-N` anchor, so without JS the browser still jumps there and
 * `:target` highlights the source. With JS this also moves keyboard / screen
 * reader focus to the cited `<li>` (which carries `tabIndex={-1}`), as the
 * mock's inline script did. One delegated listener for the whole page.
 */
export function ImpactFootnoteFocus() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>(
        '.wealth-impact-fn a[href^="#impact-source-"]',
      );
      if (!link) return;
      const source = document.getElementById(link.hash.slice(1));
      if (!source) return;
      window.setTimeout(() => source.focus({ preventScroll: true }), 0);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
