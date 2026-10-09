"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import {
  activeEntryIndex,
  getAccountNavLinks,
} from "~/app/(storefront)/_components/nav";

import { GloveContainer } from "../shared/glove-container";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { sentenceCase } from "../shared/glove-sentence-case";
import { GloveTitleBand } from "../shared/glove-title-band";
import { gloveLinkAllowed } from "../steps/glove-links";

const EASY_GUIDE_HREF = "/easy-guide";

type GloveAccountLayoutProps = {
  children: ReactNode;
  /** The section name, rendered as the plum band's h1 ("Orders"). */
  heading: string;
  /** Rendered in the band under the h1, e.g. an order status badge. */
  headingAside?: ReactNode;
  /** Replaces the default "Home / My Account / heading" trail. */
  breadcrumb?: { label: string; href?: string }[];
};

/**
 * The shared shell for all nine account pages, her "client book": a plum band
 * whose h1 is the section name (breadcrumb above it, any aside such as the
 * order status under it), a welcome card, then a pill nav (a vertical list in
 * the 240px column on desktop, a sideways-scrolling row with a right-edge fade
 * below `lg`) beside the page content. The wrapper is `.glove-account`, the
 * bridge that maps glove tokens onto the shadcn variables the shared account
 * components (better-auth cards, address book, preferences) read. Links come
 * from `getAccountNavLinks`, so the list always matches the store's flags.
 *
 * Headings: the band is the page's only h1, so card and empty-state headings
 * inside pages are h2.
 */
export function GloveAccountLayout({
  children,
  heading,
  headingAside,
  breadcrumb,
}: GloveAccountLayoutProps) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();

  const navItems = getAccountNavLinks({ isEnabled });
  const activeIndex = activeEntryIndex(pathname, navItems);

  // Right-edge fade on the phone pill row, only while more is hidden.
  const scrollRef = useRef<HTMLUListElement>(null);
  const [fadeRight, setFadeRight] = useState(false);
  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Bring the active pill into the row's view (Preferences sits last).
    const active = el.querySelector<HTMLElement>("[aria-current='page']");
    if (active && el.scrollWidth > el.clientWidth) {
      const overflowRight =
        active.offsetLeft +
        active.offsetWidth -
        (el.scrollLeft + el.clientWidth);
      if (overflowRight > 0) el.scrollLeft += overflowRight + 24;
    }
    updateFade();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFade, pathname, navItems.length]);

  return (
    <div className="glove-account">
      <GloveTitleBand
        variant="plum"
        title={heading}
        breadcrumb={
          breadcrumb ?? [
            { label: "Home", href: "/" },
            { label: "My Account", href: "/account/settings" },
            { label: heading },
          ]
        }
      >
        {headingAside}
      </GloveTitleBand>

      <section className="glove-section">
        <GloveContainer>
          <GloveAccountWelcome isEnabled={isEnabled} />

          <div className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
            <nav aria-label="Account" className="min-w-0">
              <ul
                ref={scrollRef}
                onScroll={updateFade}
                className={cn(
                  "glove-tabs-scroll m-0 flex list-none gap-1.5 overflow-x-auto p-0 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible",
                  fadeRight && "glove-tabs-scroll--fade",
                )}
              >
                {navItems.map((item, i) => {
                  const active = i === activeIndex;
                  return (
                    <li key={item.key} className="shrink-0">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        // Inset the focus ring: the scrolling pill row clips an outer one.
                        style={{ outlineOffset: -3 }}
                        className={cn(
                          "glove-display flex min-h-11 items-center rounded-full px-4 text-[15px] font-medium whitespace-nowrap transition-colors duration-150",
                          active
                            ? "bg-[var(--glove-mist)] text-[var(--glove-primary)]"
                            : "text-[var(--glove-text)] hover:text-[var(--glove-primary)]",
                        )}
                      >
                        {sentenceCase(item.label)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="min-w-0">{children}</div>
          </div>
        </GloveContainer>
      </section>
    </div>
  );
}

/**
 * "Welcome back, {first name}": one compact mist card above the nav and
 * content. Reads the session store the header already subscribes to (no new
 * query). Until the session settles it renders "Welcome back" on the same
 * line box, so nothing shifts when the name arrives.
 */
function GloveAccountWelcome({
  isEnabled,
}: {
  isEnabled: (key: string) => boolean;
}) {
  const { data: session } = useHydratedSession();
  const firstName = session?.user.name?.trim().split(/\s+/)[0] ?? "";
  const showGuide = gloveLinkAllowed(EASY_GUIDE_HREF, isEnabled);

  return (
    <div className="flex flex-col gap-0.5 rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] px-4 pt-3 pb-1 sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <GloveHandIcon className="size-8 shrink-0 text-[var(--glove-primary)] sm:size-10 md:size-11" />
        <div className="min-w-0">
          <p className="glove-display m-0 text-[18px] leading-snug font-medium text-[var(--glove-ink)] md:text-[20px]">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </p>
          <p className="m-0 mt-0.5 hidden text-[14px] leading-snug text-[var(--glove-text)] sm:block md:text-[15px]">
            Your orders, addresses and preferences, all in one place.
          </p>
        </div>
      </div>
      {showGuide ? (
        <Link
          href={EASY_GUIDE_HREF}
          className="glove-display group inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start pl-11 text-[14px] font-medium text-[var(--glove-primary)] underline-offset-4 hover:underline sm:self-auto sm:pl-0 md:text-[15px]"
        >
          How to customize your LuvGluv
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}
