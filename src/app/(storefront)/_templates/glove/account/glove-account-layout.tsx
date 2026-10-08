"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import {
  activeEntryIndex,
  getAccountNavLinks,
} from "~/app/(storefront)/_components/nav";

import { GloveBreadcrumb } from "../shared/glove-breadcrumb";
import { GloveContainer } from "../shared/glove-container";
import { GloveTitleBand } from "../shared/glove-title-band";

type GloveAccountLayoutProps = {
  children: ReactNode;
  /** The page's own heading (an h2: the band above carries the page's h1). */
  heading: string;
  /** Rendered beside the heading, e.g. an order status badge. */
  headingAside?: ReactNode;
  /** Replaces the default "Home / My Account / heading" trail. */
  breadcrumb?: { label: string; href?: string }[];
};

/**
 * The shared shell for all nine account pages: a navy "My Account" band, then
 * a Woo-style left list (hairline rows, active link in the brand purple) that
 * becomes a horizontally scrolling underline tab row below `lg`. The wrapper
 * is `.glove-account`, the bridge that maps glove tokens onto the shadcn
 * variables the shared account components (better-auth cards, address book,
 * preferences) read. Links come from `getAccountNavLinks`, so the list always
 * matches the store's flags.
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

  return (
    <div className="glove-account">
      <GloveTitleBand title="My Account" />

      <section className="glove-section">
        <GloveContainer>
          <GloveBreadcrumb
            className="mb-8"
            items={
              breadcrumb ?? [
                { label: "Home", href: "/" },
                { label: "My Account", href: "/account/settings" },
                { label: heading },
              ]
            }
          />

          <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
            <nav aria-label="Account" className="min-w-0">
              <ul className="m-0 flex list-none overflow-x-auto border-b border-[var(--glove-line)] p-0 lg:flex-col lg:overflow-visible lg:border-t lg:border-b-0 lg:border-[var(--glove-line)]">
                {navItems.map((item, i) => {
                  const active = i === activeIndex;
                  return (
                    <li key={item.key} className="shrink-0 lg:shrink">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        // Inset the focus ring: the scrolling tab row clips an outer one.
                        style={{ outlineOffset: -3 }}
                        className={cn(
                          "glove-display -mb-px block border-b-2 px-4 py-3 text-[13px] font-medium tracking-[0.04em] whitespace-nowrap uppercase transition-colors lg:mb-0 lg:border-b lg:border-l-[3px] lg:py-3.5",
                          active
                            ? "border-b-[color:var(--glove-primary)] text-[var(--glove-primary)] lg:border-b-[color:var(--glove-line)] lg:border-l-[color:var(--glove-primary)]"
                            : "border-b-transparent text-[var(--glove-nav)] hover:text-[var(--glove-primary)] lg:border-b-[color:var(--glove-line)] lg:border-l-transparent",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="glove-display text-[26px] leading-tight font-medium text-[var(--glove-ink)] md:text-[30px]">
                  {heading}
                </h2>
                {headingAside}
              </div>
              {children}
            </div>
          </div>
        </GloveContainer>
      </section>
    </div>
  );
}
