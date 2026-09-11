"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Leaf } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
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

import { BambooSocialIcons, readBambooSocialLinks } from "./bamboo-social-icons";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Session state from the header, which owns the hydrated session — only
   * meaningful once the header's `isPending` resolves. The header passes
   * `!!session?.user`.
   */
  isAuthenticated: boolean;
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
const childLinkBase =
  "block py-2 pl-1 font-sans text-lg transition-colors";
const childLinkIdle = "text-[var(--bam-cream)]/85 hover:text-[var(--bam-gold-soft)]";
const childLinkActive = "text-[var(--bam-gold-soft)]";

/**
 * BambooMobileNav — full-screen forest takeover. One surface (no bands): a
 * pinned brand row, a scrollable serif link list with a staggered fade-up
 * entrance and a short gold rule marking the active page (plus a hairline-
 * divided wishlist row when the flag is on), and a pinned bottom block
 * (signed-out-only auth pair, socials, tagline). Opens from the right and
 * closes on navigation.
 */
export function BambooMobileNav({
  open,
  onOpenChange,
  business,
  isAuthenticated,
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

  const links =
    (business?.siteContent?.navigationItems as NavLink[]) ?? NAV_LINKS;
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
          "[&>button]:bg-transparent [&>button]:text-[var(--bam-cream)] [&>button]:opacity-80 [&>button]:transition-colors [&>button]:data-[state=open]:bg-transparent [&>button]:hover:bg-[var(--bam-forest-deep)] [&>button]:hover:text-[var(--bam-gold-soft)] [&>button]:hover:opacity-100 [&>button]:focus-visible:ring-[var(--bam-gold-soft)]",
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

        {/* Top row — brand cluster, pinned */}
        <div className="shrink-0 px-6 pt-12 pr-14 pb-6 sm:px-8 sm:pr-16">
          <SheetTitle className="flex items-center gap-3 text-left text-lg font-normal text-[var(--bam-cream)]">
            <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bam-cream)] ring-1 ring-[var(--bam-gold-soft)]/60">
              {logoUrl ? (
                /* Decorative: the business name is visible text right beside
                   the disc inside the same SheetTitle. */
                <Image
                  src={logoUrl}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-contain p-1.5"
                />
              ) : (
                <Leaf
                  className="size-5 text-[var(--bam-forest)]"
                  aria-hidden="true"
                />
              )}
            </span>
            <span className="font-heading min-w-0 truncate text-[var(--bam-cream)]">
              {businessName}
            </span>
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
            {links.map((link, i) =>
              link.children?.length ? (
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
                    className={cn(
                      "flex w-full items-center justify-between gap-3 py-3 text-left font-serif text-3xl leading-tight transition-colors sm:py-4",
                      link.children.some((c) => pathname === c.href)
                        ? topLinkActive
                        : topLinkIdle,
                    )}
                  >
                    <span className="flex flex-col items-start">
                      <span>{link.label}</span>
                      {link.children.some((c) => pathname === c.href) &&
                        activeRule}
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
                    <div className="flex flex-col pb-2 pl-4">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          target={child.external ? "_blank" : undefined}
                          rel={child.external ? "noopener noreferrer" : undefined}
                          onClick={() => onOpenChange(false)}
                          aria-current={
                            pathname === child.href ? "page" : undefined
                          }
                          className={cn(
                            childLinkBase,
                            pathname === child.href
                              ? childLinkActive
                              : childLinkIdle,
                          )}
                        >
                          {child.label}
                          {child.external && (
                            <span className="sr-only"> (opens in new tab)</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  onClick={() => onOpenChange(false)}
                  aria-current={pathname === link.href ? "page" : undefined}
                  style={fadeUpStyle(i)}
                  className={cn(
                    topLinkBase,
                    pathname === link.href ? topLinkActive : topLinkIdle,
                  )}
                >
                  <span>{link.label}</span>
                  {pathname === link.href && activeRule}
                  {link.external && (
                    <span className="sr-only"> (opens in new tab)</span>
                  )}
                </Link>
              ),
            )}
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
                  "bamboo-mobile-nav-item flex items-center gap-2.5 py-3 font-sans text-lg transition-colors",
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

        {/* Bottom block — pinned, signed-out auth pair + socials + tagline */}
        <div className="shrink-0 px-6 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8">
          {isEnabled("customerAccounts") && !isAuthenticated && (
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-full border-[var(--bam-gold-soft)]/70 bg-transparent px-5 text-[var(--bam-gold-soft)] shadow-none hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)]"
              >
                <Link href="/auth/sign-up" onClick={() => onOpenChange(false)}>
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
          )}

          <BambooSocialIcons
            socialLinks={socialLinks}
            label="Follow us"
            className="gap-3"
            linkClassName="size-9 rounded-full border border-[var(--bam-gold-soft)]/50 text-[var(--bam-gold-soft)] hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)]"
            onLinkClick={() => onOpenChange(false)}
          />

          <p className="mt-4 text-xs text-[var(--bam-cream)]/70">
            Tree-free products · Crafted with care
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
