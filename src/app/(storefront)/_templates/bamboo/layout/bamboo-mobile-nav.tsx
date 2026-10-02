"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { isActiveNavLink } from "~/lib/nav-utils";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import {
  activeEntryIndex,
  externalLinkProps,
  filterNavByFlags,
  isNavItemActive,
  navGroupEntries,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

import { BambooLeafSprig } from "../shared/bamboo-leaf-sprig";
import { BambooNavSheetAccount } from "./bamboo-nav-sheet-account";
import {
  BambooSocialIcons,
  readBambooSocialLinks,
} from "./bamboo-social-icons";

/** Same shipped default as `bamboo-header.tsx`'s `BAMBOO_DEFAULT_NAV` — see
 *  that file's comment for why the three chrome files each keep their own
 *  copy instead of sharing a `lib/` module. */
const BAMBOO_DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hydrated session from the header's `useHydratedSession` — the header
   *  owns it so the bar and the sheet can't disagree. */
  session: HydratedSession;
  isPending: boolean;
  /** Short line at the bottom of the sheet, below socials. Blank hides it. */
  menuTagline: string;
  /** Optional horizontal wordmark, already resolved by the header from
   *  `bamboo.global.nav-wordmark`. When set it replaces the round logo in
   *  the top brand block, same priority order as the header's own brand. */
  wordmarkUrl?: string;
} & DefaultHeaderTemplateProps;

/** The stagger keyframe's own timing — kept in one place so the class and
 *  the per-item delay below agree on how "subtle" the entrance reads. */
const FADE_UP_ANIMATION =
  "bamboo-mobile-nav-fade-up 420ms cubic-bezier(0.16, 1, 0.3, 1) both";
const FADE_UP_STEP_MS = 50;
const FADE_UP_MAX_STEPS = 8;

/** Per-item entrance style for the staggered takeover reveal. Capped so a
 *  long nav list doesn't stretch the total stagger past a beat. */
function fadeUpStyle(index: number): React.CSSProperties {
  return {
    animation: FADE_UP_ANIMATION,
    animationDelay: `${Math.min(index, FADE_UP_MAX_STEPS) * FADE_UP_STEP_MS}ms`,
  };
}

/** Serif top-level link styling — idle cream, active gold-soft with a short
 *  rule beneath (replaces the old border-l-4 rail entirely). */
const topLinkBase =
  "bamboo-mobile-nav-item flex flex-col items-start py-3 font-serif text-3xl leading-tight transition-colors sm:py-4";
const topLinkIdle = "text-[var(--bam-cream)] hover:text-[var(--bam-gold-soft)]";
const topLinkActive = "text-[var(--bam-gold-soft)]";
const activeRule = (
  <span
    aria-hidden="true"
    className="mt-1.5 block h-px w-8 bg-[var(--bam-gold-soft)]"
  />
);

/** Smaller sans styling for expanded child links. */
const childLinkBase = "block py-2 pl-1 text-lg transition-colors";
const childLinkIdle =
  "text-[var(--bam-cream)]/85 hover:text-[var(--bam-gold-soft)]";
const childLinkActive = "text-[var(--bam-gold-soft)]";

/**
 * BambooMobileNav — full-screen forest takeover. One surface (no bands): a
 * pinned brand row, a scrollable serif link list with a staggered fade-up
 * entrance and a short gold rule marking the active page (plus a hairline-
 * divided wishlist row when the flag is on), and a pinned bottom block
 * (signed-out auth pair OR the signed-in account block, socials, tagline).
 * Opens from the right and closes on navigation.
 */
export function BambooMobileNav({
  open,
  onOpenChange,
  business,
  session,
  isPending,
  menuTagline,
  wordmarkUrl,
}: MobileNavProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const { count: wishlistCount } = useWishlist();
  const { isEnabled } = useStorefrontFlags();
  const socialLinks = readBambooSocialLinks(business?.siteContent?.socialLinks);

  // The sheet portals to document.body by default, which escapes the .bamboo
  // scope class — every var(--bam-*) token and font variable would resolve to
  // nothing. Portal into the template wrapper instead so the sheet inherits
  // tokens, fonts, and any owner theme overrides. This also means the sheet
  // is a DOM descendant of .bamboo, so the .bamboo prefers-reduced-motion
  // block below reaches the entrance animation below.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>("div.bamboo"));
  }, []);

  const links = filterNavByFlags(
    resolveNav(business?.siteContent?.navigationItems, BAMBOO_DEFAULT_NAV),
    isEnabled,
  );
  const logoUrl = business.siteContent?.logoUrl;
  const businessName = business.name ?? "Menu";

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        container={container}
        // The sheet is controlled from the header's hamburger — there is no
        // Radix SheetTrigger, so on close Radix has nothing to restore focus
        // to and it lands on <body>. Send it back to the hamburger ourselves.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          container
            ?.querySelector<HTMLElement>('button[aria-label="Open menu"]')
            ?.focus();
        }}
        className={cn(
          "flex w-full flex-col gap-0 border-l-0 bg-[var(--bam-forest)] p-0 sm:max-w-none",
          "[&>button]:bg-transparent [&>button]:text-[var(--bam-cream)] [&>button]:opacity-80 [&>button]:transition-colors [&>button]:hover:bg-[var(--bam-forest-deep)] [&>button]:hover:text-[var(--bam-gold-soft)] [&>button]:hover:opacity-100 [&>button]:focus-visible:ring-[var(--bam-gold-soft)] [&>button]:data-[state=open]:bg-transparent",
        )}
      >
        {/* Local entrance keyframe + a reduced-motion guard for the per-item
            delay. The .bamboo block in globals.css already forces
            animation-duration to ~0 under prefers-reduced-motion (and it
            reaches here, since the sheet portals into div.bamboo), but it
            doesn't touch animation-delay — without this, a reduced-motion
            visitor would still see items reveal one at a time (each pop
            instant, but staggered). This zeroes the delay too so every item
            is visible together, immediately. */}
        <style>{`
          @keyframes bamboo-mobile-nav-fade-up {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .bamboo-mobile-nav-item {
              animation-delay: 0ms !important;
            }
          }
        `}</style>

        {/* Corner sprig, bottom-right: the nav bar's top-left sprig answered
            from the opposite corner. `-z-[1]` paints it behind every link
            and control but above the sheet's own forest background (the
            fixed, z-indexed SheetContent is the stacking context). The
            bottom block's content is left-aligned and narrow, so the sprig
            keeps to the empty right side; sized per breakpoint so it never
            reaches the tagline, socials or auth pair. */}
        <BambooLeafSprig
          flip
          className="absolute right-0 bottom-0 -z-[1] w-24 opacity-80 min-[375px]:w-36 sm:w-48"
        />

        {/* Top row — brand cluster, pinned and centred (the mini-emblem
            treatment from the header, scaled up to the sheet's full-width
            surface). Symmetric `px-14` keeps it clear of the close button on
            both sides, rather than the old left-aligned row's one-sided
            `pr-14`. `SheetTitle` stays the dialog's actual accessible name:
            with a logo or wordmark the business name rides along as
            `sr-only` text inside it (still part of the computed name), and
            with neither it's the only, visible content. */}
        <div className="shrink-0 px-14 pt-12 pb-6 sm:px-16">
          <SheetTitle className="flex flex-col items-center gap-2 text-center text-lg font-normal text-[var(--bam-cream)]">
            {wordmarkUrl ? (
              <>
                {/* Decorative: the business name travels with it as sr-only
                    text below, so the image itself carries no alt text. */}
                <Image
                  src={wordmarkUrl}
                  alt=""
                  width={352}
                  height={80}
                  sizes="176px"
                  className="h-10 w-auto max-w-[12rem] object-contain"
                />
                <span className="sr-only">{businessName}</span>
              </>
            ) : logoUrl ? (
              <>
                {/* Same visual language as the header's mini hanging seal
                    (cream disc, gold ring-[3px], shadow-lg), full-size here
                    since the sheet has no bar to hang it from. */}
                <span className="relative block size-20 shrink-0 rounded-full bg-[var(--bam-cream)] shadow-lg ring-[3px] ring-[var(--bam-gold-soft)]">
                  <Image
                    src={logoUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-1.5"
                  />
                </span>
                <span className="sr-only">{businessName}</span>
              </>
            ) : (
              <span className="font-heading uppercase tracking-[0.18em]">
                {businessName}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Primary site navigation for {business.name ?? "this store"}. Choose
            a page to continue.
          </SheetDescription>
        </div>

        {/* Scrollable link list — the takeover moment */}
        <nav
          className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col">
            {links.map((link, i) => {
              if (link.children?.length) {
                // The trigger never navigates — a non-empty parent href is
                // the accordion's first entry (`navGroupEntries`), so the
                // parent's own page stays reachable instead of being dropped.
                const entries = navGroupEntries(link);
                const activeIdx = activeEntryIndex(pathname, entries);
                const itemActive = isNavItemActive(pathname, link);
                const sublistId = `bamboo-mobile-nav-group-${i}`;
                return (
                  <div
                    key={link.href + link.label}
                    // The stagger animation runs on this wrapper, so the
                    // reduced-motion delay guard must target it too.
                    className="bamboo-mobile-nav-item"
                    style={fadeUpStyle(i)}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(i)}
                      aria-expanded={expandedItems.has(i)}
                      aria-controls={sublistId}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 py-3 text-left font-serif text-3xl leading-tight transition-colors sm:py-4",
                        itemActive ? topLinkActive : topLinkIdle,
                      )}
                    >
                      <span className="flex flex-col items-start">
                        <span>{link.label}</span>
                        {itemActive && activeRule}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 transition-transform duration-200",
                          expandedItems.has(i) ? "rotate-180" : "",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {expandedItems.has(i) && (
                      <div id={sublistId} className="flex flex-col pb-2 pl-4">
                        {entries.map((child, j) => {
                          const childActive = j === activeIdx;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              {...externalLinkProps(child.external)}
                              onClick={() => onOpenChange(false)}
                              aria-current={childActive ? "page" : undefined}
                              className={cn(
                                childLinkBase,
                                childActive ? childLinkActive : childLinkIdle,
                              )}
                            >
                              {child.label}
                              {child.external && (
                                <span className="sr-only">
                                  {" "}
                                  (opens in new tab)
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = isActiveNavLink(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  {...externalLinkProps(link.external)}
                  onClick={() => onOpenChange(false)}
                  aria-current={isActive ? "page" : undefined}
                  style={fadeUpStyle(i)}
                  className={cn(
                    topLinkBase,
                    isActive ? topLinkActive : topLinkIdle,
                  )}
                >
                  <span>{link.label}</span>
                  {isActive && activeRule}
                  {link.external && (
                    <span className="sr-only"> (opens in new tab)</span>
                  )}
                </Link>
              );
            })}
          </div>

          {isEnabled("wishlist") && (
            <div className="border-t border-[var(--bam-gold-soft)]/25 pt-2 pb-2">
              <Link
                href="/wishlist"
                onClick={() => onOpenChange(false)}
                aria-current={pathname === "/wishlist" ? "page" : undefined}
                aria-label={`Wishlist with ${wishlistCount} items`}
                style={fadeUpStyle(links.length)}
                className={cn(
                  "bamboo-mobile-nav-item flex items-center gap-2.5 py-3 text-lg transition-colors",
                  pathname === "/wishlist"
                    ? "text-[var(--bam-gold-soft)]"
                    : "text-[var(--bam-cream)] hover:text-[var(--bam-gold-soft)]",
                )}
              >
                <Heart className="size-4" aria-hidden="true" />
                <span aria-hidden="true">Wishlist</span>
                {wishlistCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="ml-auto rounded-full bg-[var(--bam-gold-soft)] px-2 py-0.5 text-xs font-medium text-[var(--bam-forest-deep)]"
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom block — pinned. Signed-out auth pair OR the signed-in
            account block (PF7), then socials + tagline. Nothing renders
            while the session is pending (B4.5 — no flash of the wrong
            state). */}
        <div className="shrink-0 px-6 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8">
          {isEnabled("customerAccounts") &&
            !isPending &&
            (session?.user ? (
              <BambooNavSheetAccount
                session={session}
                isEnabled={isEnabled}
                onClose={() => onOpenChange(false)}
              />
            ) : (
              <div className="mb-6 flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-full border-[var(--bam-gold-soft)]/70 bg-transparent px-5 text-[var(--bam-gold-soft)] shadow-none hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)]"
                >
                  <Link
                    href="/auth/sign-up"
                    onClick={() => onOpenChange(false)}
                  >
                    Sign up
                  </Link>
                </Button>
                <Link
                  href="/auth/sign-in"
                  onClick={() => onOpenChange(false)}
                  className="text-sm font-medium text-[var(--bam-cream)] underline-offset-4 hover:underline"
                >
                  Log in
                </Link>
              </div>
            ))}

          <BambooSocialIcons
            socialLinks={socialLinks}
            label="Follow us"
            className="gap-3"
            linkClassName="size-9 rounded-full border border-[var(--bam-gold-soft)]/50 text-[var(--bam-gold-soft)] hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)]"
            onLinkClick={() => onOpenChange(false)}
          />

          {!!menuTagline && (
            <p
              className="mt-4 text-xs text-[var(--bam-cream)]/70"
              {...fieldAttr("bamboo.global.menu-tagline")}
            >
              {menuTagline}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
