"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Heart, Menu, ShoppingBag } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { resolveFields } from "..";
import { BambooCartDrawer } from "../cart-checkout/bamboo-cart-drawer";
import { BambooMobileNav } from "./bamboo-mobile-nav";
import {
  BambooSocialIcons,
  readBambooSocialLinks,
} from "./bamboo-social-icons";

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

/**
 * BambooHeader — the "hanging emblem" nav, bamboo's signature moment.
 *
 * Desktop (lg and up) is three stable cells that never re-order: socials on
 * the left, the split nav + emblem in the middle, account/wishlist/cart on the
 * right. The outer cells are both `flex-1 basis-0`, which is what keeps the
 * emblem on the bar's true centre in BOTH states:
 *
 * - **Expanded** (page not scrolled): the links split into two halves around a
 *   large circular logo (size-28/lg:size-32 at top-2) hanging ~40% below the
 *   forest bar.
 * - **Compact** (once scrolled): the emblem SHRINKS IN PLACE — never migrating
 *   to a corner — into a 72px "mini-hang": size-18 at top-6, so 24 + 72 = 96
 *   against the 80px bar still leaves a 16px lip breaking the forest edge. It
 *   keeps its gold ring-2 and takes a lighter shadow-sm. The gesture survives
 *   the scroll instead of collapsing into an avatar-sized chip.
 *
 * The one exception is the merchant `nav-wordmark`: a horizontal wordmark has
 * nothing to hang, so when one exists the compact anchor re-centres on the bar
 * (top-1/2) and the wordmark cross-fades in over the disc, which fades out.
 *
 * Everything else about the bar is deliberately CONSTANT across the flip — the
 * socials stay in the left cell (balancing the right-side actions rather than
 * leaving a hole), the nav `gap-8` and the links' `tracking-widest` never move.
 * The emblem resizing between the two link halves is the only change of shape.
 *
 * The state flips from an IntersectionObserver watching an 80px-tall sentinel
 * at the top of the page (never a scroll listener) — compact engages once the
 * sentinel has fully scrolled out. The bar's in-flow height is constant in both
 * states (h-16 / lg:h-20): animating the height would move the observer
 * threshold and make the header oscillate at the boundary. So every sanctioned
 * size transition (`width` on the emblem slot, `top`/`width`/`height` on the
 * absolutely-positioned emblem itself, `padding` on its image) is sealed inside
 * the emblem slot — none of it can reflow the bar. All of it is zeroed by the
 * `.bamboo` reduced-motion block.
 *
 * The emblem is ONE `<Link>` mounted in both states, so keyboard focus never
 * jumps when the bar changes shape. Anything hidden is `invisible` (with
 * `visibility` in the transition list so it flips discretely at the end of a
 * fade-out and immediately on a fade-in) rather than bare `opacity-0`, so focus
 * can never land on something nobody can see.
 *
 * Below lg the bar is a plain row — brand (wordmark, or disc + name) · user
 * button when signed in · cart · hamburger. Everything else (nav links, auth
 * buttons, wishlist, socials) lives in the mobile sheet.
 */
export function BambooHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const { count: wishlistCount } = useWishlist();
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const { isEnabled } = useStorefrontFlags();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Scroll-shrink. SSR and the first client render are always expanded, so the
  // server HTML and the hydrated tree agree; the observer settles the real
  // state on mount.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setCompact(!entry?.isIntersecting),
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Announce cart changes to screen readers. The initial hydration value is
  // skipped so nothing is announced on a plain page load.
  const [cartAnnouncement, setCartAnnouncement] = useState("");
  const prevItemCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevItemCount.current === null) {
      prevItemCount.current = itemCount;
      return;
    }
    if (itemCount !== prevItemCount.current) {
      setCartAnnouncement(
        itemCount === 0
          ? "Cart is now empty."
          : `Cart updated. ${itemCount} ${itemCount === 1 ? "item" : "items"} in cart.`,
      );
      prevItemCount.current = itemCount;
    }
  }, [itemCount]);

  // Close desktop dropdown on Escape, returning focus to trigger
  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const trigger = triggerRefs.current.get(openDropdown);
        setOpenDropdown(null);
        trigger?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  const links =
    (business?.siteContent?.navigationItems as NavLink[]) ?? NAV_LINKS;
  const socialLinks = readBambooSocialLinks(business?.siteContent?.socialLinks);
  const logoUrl = business.siteContent?.logoUrl;
  const businessName = business.name ?? "Business";

  // Optional horizontal wordmark. When set it replaces the round logo in the
  // compact centre slot and in the sub-lg brand cluster; blank keeps the disc.
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.global.nav-wordmark",
  ]);
  const wordmarkValue = f["bamboo.global.nav-wordmark"]?.trim();
  const wordmarkUrl = wordmarkValue === "" ? undefined : wordmarkValue;

  // The emblem gap sits between the two link halves; with an odd count the
  // extra link goes to the left half.
  const splitIndex = Math.ceil(links.length / 2);

  /*
    Signed-out actions, lg and up only — below lg the sheet carries them, so
    the mobile bar stays brand · cart · menu. `variant="outline"` ships
    `bg-background` + `shadow-xs`, which would read as a pale chip on the
    forest bar; `bg-transparent` and the explicit gold border/text override it.
  */
  const authActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="hidden text-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)] lg:inline-flex"
      >
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="hidden rounded-full border-[var(--bam-gold-soft)]/70 bg-transparent px-4 text-[var(--bam-gold-soft)] shadow-none hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)] lg:inline-flex"
      >
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </>
  );

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="border-primary border"
      avatarClassName="size-10"
      links={[
        {
          icon: <IconPackage className="h-4 w-4" />,
          label: "Orders",
          href: "/account/orders",
        },
        ...(session?.user?.platformRole === "PLATFORM_ADMIN" ||
        !!session?.session?.membershipId
          ? [
              {
                icon: <IconLayoutDashboard className="h-4 w-4" />,
                label: "Admin",
                href: "/admin",
              },
            ]
          : []),
      ]}
    />
  );

  const navLinkClass = (isActive: boolean) =>
    cn(
      "relative inline-flex items-center gap-1 py-2 text-sm tracking-widest uppercase transition-[opacity,transform,color] duration-300",
      isActive
        ? "text-[var(--bam-gold-soft)]"
        : "text-[var(--bam-gold-soft)]/80 hover:text-[var(--bam-cream)]",
    );

  const activeUnderline = (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[var(--bam-gold-soft)]"
    />
  );

  const renderNavItem = (link: NavLink, i: number) => {
    if (link.children?.length) {
      const childActive = link.children.some((c) => pathname === c.href);
      return (
        <div
          key={link.href + link.label}
          className="relative"
          onMouseEnter={() => setOpenDropdown(i)}
          onMouseLeave={() => setOpenDropdown(null)}
          onBlur={(e) => {
            // Close when focus leaves the wrapper entirely
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpenDropdown(null);
            }
          }}
        >
          <button
            type="button"
            ref={(el) => {
              if (el) triggerRefs.current.set(i, el);
              else triggerRefs.current.delete(i);
            }}
            aria-haspopup="true"
            aria-expanded={openDropdown === i ? "true" : "false"}
            aria-controls={`bamboo-nav-dropdown-${i}`}
            onClick={() => setOpenDropdown(openDropdown === i ? null : i)}
            className={cn(
              navLinkClass(childActive),
              "cursor-pointer border-none bg-transparent px-0",
            )}
          >
            {link.label}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                openDropdown === i ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
            {childActive && activeUnderline}
          </button>

          {openDropdown === i && (
            <div
              id={`bamboo-nav-dropdown-${i}`}
              // z-20: the emblem link is z-10 and overhangs the bar, so a
              // dropdown opened from the left link half must stack above it.
              className="absolute top-full left-1/2 z-20 -translate-x-1/2 pt-3"
            >
              <div className="min-w-[180px] overflow-hidden rounded-(--radius) border border-[var(--bam-hairline)] bg-[var(--bam-cream)] shadow-lg">
                {link.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    target={child.external ? "_blank" : undefined}
                    rel={child.external ? "noopener noreferrer" : undefined}
                    aria-current={pathname === child.href ? "page" : undefined}
                    onClick={() => setOpenDropdown(null)}
                    className={cn(
                      "block px-4 py-2.5 text-sm transition-colors",
                      pathname === child.href
                        ? "bg-[var(--bam-cream-deep)] font-medium text-[var(--bam-forest-deep)]"
                        : "text-[var(--bam-forest)] hover:bg-[var(--bam-cream-deep)]",
                    )}
                  >
                    {child.label}
                    {child.external && (
                      <span className="sr-only"> (opens in new tab)</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    const isActive = pathname === link.href;
    return (
      <Link
        key={link.href}
        href={link.href}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        aria-current={isActive ? "page" : undefined}
        className={navLinkClass(isActive)}
      >
        {link.label}
        {link.external && <span className="sr-only"> (opens in new tab)</span>}
        {isActive && activeUnderline}
      </Link>
    );
  };

  return (
    <>
      {/*
        Scroll sentinel. Absolutely anchored to the template layout root (which
        is `relative`) so it marks the very top of the document regardless of
        where the sticky header lands.
      */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 h-20 w-px"
      />

      <header className="sticky top-0 z-50 w-full bg-[var(--bam-forest)]">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:h-20 lg:px-8">
          {/*
            Left cell — sub-lg brand, then the social row. `flex-1 basis-0`
            here and on the actions cell is what pins the emblem to the bar's
            true centre in both states, whatever the two link halves measure.
          */}
          <div className="flex min-w-0 flex-1 basis-0 items-center">
            {/*
              Sub-lg identity only: at lg and up the emblem slot in the nav is
              the one and only brand mark, so this never competes with it and
              carries no compact styling at all.
            */}
            <Link
              href="/"
              aria-label={`${businessName} — home`}
              className="flex min-w-0 items-center gap-3 lg:hidden"
            >
              {/* Decorative in every branch: the wrapping Link already carries
                  the accessible name via aria-label. */}
              {wordmarkUrl ? (
                <Image
                  src={wordmarkUrl}
                  alt=""
                  width={320}
                  height={64}
                  sizes="160px"
                  className="h-8 w-auto max-w-[10rem] object-contain"
                />
              ) : (
                <>
                  {logoUrl ? (
                    <span className="relative block size-10 shrink-0 rounded-full bg-[var(--bam-cream)] ring-1 ring-[var(--bam-gold-soft)]/60">
                      <Image
                        src={logoUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-contain p-1.5"
                      />
                    </span>
                  ) : null}
                  <span className="font-heading truncate text-lg text-[var(--bam-cream)] sm:text-xl">
                    {businessName}
                  </span>
                </>
              )}
            </Link>

            {/*
              Socials are a constant of the lg+ bar — they stay put through the
              compact flip so the left cell keeps balancing the right-side
              account/wishlist/cart cluster instead of emptying out.
            */}
            <BambooSocialIcons
              socialLinks={socialLinks}
              label="Follow us"
              className="mr-2 hidden lg:flex"
              linkClassName="size-9 rounded-full border border-[var(--bam-gold-soft)]/50 text-[var(--bam-gold-soft)] hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)]"
              iconClassName="size-4"
            />
          </div>

          {/*
            Desktop nav — ONE link set, centred in both states. The gap is a
            constant `gap-8`: the compact flip resizes the emblem slot between
            the two link halves and nothing else, so the bar's rhythm holds.
            `self-stretch` gives the emblem slot the full bar height to hang
            from.
          */}
          <nav
            className="hidden flex-1 items-center justify-center gap-8 self-stretch lg:flex"
            aria-label="Main navigation"
          >
            {links
              .slice(0, splitIndex)
              .map((link, i) => renderNavItem(link, i))}

            {/*
              The emblem slot — ALWAYS mounted, and always exactly one <Link>,
              so focus can never be dropped by the compact flip. The slot
              reserves the footprint in flow while the emblem itself is
              absolutely positioned inside it, so the width/top/size
              transitions below are sealed off from the bar's height.

              Compact shows the disc alone (no name text beside it); a merchant
              who wants a named compact centre uploads the nav-wordmark, which
              cross-fades in over the shrinking disc — and, since a horizontal
              wordmark cannot hang off the bar, re-centres the anchor on it.
            */}
            {logoUrl ? (
              <div
                className={cn(
                  "relative h-full shrink-0 transition-[width] duration-300",
                  compact ? (wordmarkUrl ? "w-44" : "w-20") : "w-28 lg:w-32",
                )}
              >
                <Link
                  href="/"
                  aria-label={`${businessName} — home`}
                  className={cn(
                    "absolute left-1/2 z-10 -translate-x-1/2 transition-[top] duration-300",
                    compact
                      ? wordmarkUrl
                        ? "top-1/2 -translate-y-1/2"
                        : "top-6 translate-y-0"
                      : "top-2 translate-y-0",
                  )}
                >
                  {/* Disc — shrinks in place to the 72px mini-hang (top-6 + 72
                      = 96 against the 80px bar, so a 16px lip still breaks the
                      forest edge); cross-fades out only when a wordmark takes
                      the compact centre over from it. */}
                  <span
                    className={cn(
                      "relative block rounded-full bg-[var(--bam-cream)] ring-2 ring-[var(--bam-gold-soft)]/70 transition-[width,height,opacity,visibility,box-shadow] duration-300",
                      compact
                        ? "size-18 shadow-sm"
                        : "size-28 shadow-md lg:size-32",
                      compact && wordmarkUrl && "invisible opacity-0",
                    )}
                  >
                    {/* Decorative: the wrapping Link already carries the
                        accessible name via aria-label. */}
                    <Image
                      src={logoUrl}
                      alt=""
                      fill
                      sizes="128px"
                      className={cn(
                        "object-contain transition-[padding] duration-300",
                        compact ? "p-2.5" : "p-4",
                      )}
                    />
                  </span>
                  {wordmarkUrl && (
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-[opacity,visibility] duration-300",
                        compact
                          ? "visible opacity-100 delay-100"
                          : "invisible opacity-0 delay-0",
                      )}
                    >
                      <Image
                        src={wordmarkUrl}
                        alt=""
                        width={352}
                        height={80}
                        sizes="176px"
                        className="h-9 w-auto max-w-[10rem] object-contain"
                      />
                    </span>
                  )}
                </Link>
              </div>
            ) : (
              /*
                No logo uploaded: the slot becomes the wordmark — serif caps,
                no disc, no ring, no hanging overhang to frame. The text stays
                in flow (rather than absolutely positioned like the disc) so it
                is what sizes the slot; `transition-[width]` is inert here.
              */
              <div className="relative flex h-full w-auto shrink-0 items-center transition-[width] duration-300">
                <Link
                  href="/"
                  aria-label={`${businessName} — home`}
                  className="relative flex items-center"
                >
                  <span
                    className={cn(
                      "font-heading truncate px-4 text-center leading-tight text-[var(--bam-cream)] uppercase transition-[font-size,letter-spacing,max-width,opacity,visibility] duration-300",
                      compact
                        ? "max-w-[12rem] text-lg tracking-[0.12em]"
                        : "max-w-[18rem] text-xl tracking-[0.18em] lg:text-2xl",
                      compact && wordmarkUrl && "invisible opacity-0",
                    )}
                  >
                    {businessName}
                  </span>
                  {wordmarkUrl && (
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-[opacity,visibility] duration-300",
                        compact
                          ? "visible opacity-100 delay-100"
                          : "invisible opacity-0 delay-0",
                      )}
                    >
                      {/* Decorative: the wrapping Link already carries the
                          accessible name via aria-label. */}
                      <Image
                        src={wordmarkUrl}
                        alt=""
                        width={352}
                        height={80}
                        sizes="176px"
                        className="h-9 w-auto max-w-[10rem] object-contain"
                      />
                    </span>
                  )}
                </Link>
              </div>
            )}

            {links
              .slice(splitIndex)
              .map((link, i) => renderNavItem(link, splitIndex + i))}
          </nav>

          {/*
            Actions — account, wishlist, cart, menu. Mirrors the left cell's
            `flex-1 basis-0` in both states so the emblem stays centred.
          */}
          <div className="flex flex-1 shrink-0 basis-0 items-center justify-end gap-1">
            {isEnabled("customerAccounts") && (
              <>
                {isPending ? (
                  <div className="hidden h-8 w-8 animate-pulse rounded-full bg-[var(--bam-forest-deep)] lg:block" />
                ) : session?.user ? (
                  userMenu
                ) : (
                  authActions
                )}
              </>
            )}

            {/* Wishlist is lg-only — below lg it lives in the mobile sheet. */}
            {isEnabled("wishlist") && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="hidden text-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)] lg:inline-flex"
              >
                <Link
                  href="/wishlist"
                  aria-label={`Wishlist with ${wishlistCount} items`}
                >
                  <span className="relative" aria-hidden="true">
                    <Heart className="size-5" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full bg-[var(--bam-gold-soft)] text-[10px] font-bold text-[var(--bam-forest-deep)]">
                        {wishlistCount}
                      </span>
                    )}
                  </span>
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              aria-label={`Shopping cart with ${itemCount} items`}
              className="text-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)]"
            >
              <span className="relative" aria-hidden="true">
                <ShoppingBag className="size-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full bg-[var(--bam-gold-soft)] text-[10px] font-bold text-[var(--bam-forest-deep)]">
                    {itemCount}
                  </span>
                )}
              </span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)] lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <BambooMobileNav
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        business={business}
        isAuthenticated={!!session?.user}
      />

      <BambooCartDrawer shippingConfig={shippingConfigFromBusiness(business)} />

      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {cartAnnouncement}
      </span>
    </>
  );
}
