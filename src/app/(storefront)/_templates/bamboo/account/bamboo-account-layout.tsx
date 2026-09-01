"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookUser, Lock, Package, Settings } from "lucide-react";

import { cn } from "~/lib/utils";

import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";

const NAV_ITEMS = [
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/security", label: "Security", icon: Lock },
  { href: "/account/address-book", label: "Address Book", icon: BookUser },
  { href: "/account/preferences", label: "Preferences", icon: Bell },
] as const;

type Props = {
  children: ReactNode;
  heading: string;
};

/**
 * Shared shell for every bamboo account page.
 *
 * Deliberately the quietest surface in the template: a warm sage strip with the
 * wreath brand mark, one torn edge, then the nav + content. No drifting leaves,
 * no swaying culm — design.md's inner-page ambient budget explicitly asks for
 * account pages to be quieter than the rest, and nothing should move over a
 * shopper's order data or a password form.
 *
 * Colour for the vendored account cards inside `children` comes from the
 * `.bamboo` Layer B shadcn bridge in globals.css (`--card`, `--primary`,
 * `--border`, `--muted-foreground`, `--ring`, …), so they render warm without
 * being forked.
 */
export function BambooAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="bg-[var(--bamboo-paper)]">
      <section
        aria-labelledby="bamboo-account-heading"
        className="bg-[var(--bamboo-sage)] px-6 pt-[112px] pb-[72px]"
        style={{ marginTop: "calc(var(--bamboo-header-offset) * -1)" }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-5">
          <BambooGlyph
            id="s-wreath"
            className="h-[52px] w-auto shrink-0 sm:h-[68px]"
          />
          <div>
            <p className="text-[0.86rem] font-medium tracking-[0.09em] text-[var(--bamboo-ink-soft)] uppercase">
              Account
            </p>
            <h1
              id="bamboo-account-heading"
              className="font-heading mt-1 text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-bold tracking-[-0.024em] text-[var(--bamboo-pine)]"
            >
              {heading}
            </h1>
          </div>
        </div>
      </section>

      <BambooEdge from="sage" to="paper" variant="b" />

      <div className="mx-auto max-w-[1200px] px-6 pt-[clamp(28px,3.2vw,48px)] pb-[clamp(56px,6vw,96px)]">
        {/* Mobile: horizontally scrolling pill tabs. */}
        <nav
          className="mb-8 flex gap-2 overflow-x-auto pb-2 md:hidden"
          aria-label="Account navigation"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : undefined}
                className="bamboo-chip shrink-0 no-underline"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop: sidebar + content. */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
          <nav className="hidden md:block" aria-label="Account navigation">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-r-[10px] border-l-2 py-2.5 pr-4 pl-3 text-[0.95rem] no-underline transition-colors duration-200",
                        active
                          ? "border-[var(--bamboo-pine)] bg-[var(--bamboo-sage)] font-semibold text-[var(--bamboo-pine)]"
                          : "border-transparent text-[var(--bamboo-ink-soft)] hover:bg-[var(--bamboo-roll)] hover:text-[var(--bamboo-pine)]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span
                        className={cn(
                          "relative",
                          "after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-[2px] after:bg-[var(--bamboo-terracotta)] after:transition-[width] after:duration-300",
                          "group-hover:after:w-full group-focus-visible:after:w-full",
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-w-0">{children}</div>
        </div>
      </div>

      <BambooEdge from="paper" to="pine" variant="c" />
    </div>
  );
}
