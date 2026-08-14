"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Heart, Menu, ShoppingBag, User } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { isActiveNavLink } from "~/lib/nav-utils";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveThemeVars } from "~/lib/template-themes";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { resolveFields } from "..";
import { PinkCartDrawer } from "../shared/pink-cart-drawer";
import { PinkMobileMenu } from "./pink-mobile-menu";
import { PinkNavDropdown } from "./pink-nav-dropdown";

/** Platform nav shape — `Business.siteContent.navigationItems` (one level of
 *  children), as validated by `navigationItemsSchema` in
 *  `src/lib/validators/content.ts` and mirrored by every other header. */
export type PinkNavChild = { href: string; label: string; external?: boolean };
export type PinkNavLink = PinkNavChild & { children?: PinkNavChild[] };

const FIELD_KEYS = [
  "pink.global.accent-word",
  "pink.global.header-cta-text",
  "pink.global.header-cta-link",
  "pink.global.basket-label",
];

/**
 * Splits a business name into { prefix, tail } where `tail` is the trailing
 * substring matching the owner-set accent word, case-insensitively — e.g.
 * "PinkArt" + "Art" → { prefix: "Pink", tail: "Art", matches: true }.
 * Falls back to `{ matches: false }` (render the name plain) when the accent
 * word is blank or the name doesn't end with it.
 */
function splitAccentWordmark(name: string, accentWord: string) {
  const trimmedAccent = accentWord.trim();
  if (
    !trimmedAccent ||
    !name.toLowerCase().endsWith(trimmedAccent.toLowerCase())
  ) {
    return { matches: false as const };
  }
  const splitIndex = name.length - trimmedAccent.length;
  return {
    matches: true as const,
    prefix: name.slice(0, splitIndex),
    tail: name.slice(splitIndex),
  };
}

export function PinkHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const { isEnabled } = useStorefrontFlags();
  const { itemCount, setIsOpen } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();

  // Mirrors vii/happy-bamboo's UserButton wiring — same additionalLinks shape,
  // same admin-visibility rule.
  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // Route change — always close the mobile menu (mirrors NoiseHeader).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const businessName = business?.name ?? "PinkArt";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);
  // The cart drawer portals outside the layout wrapper that carries these, so
  // it has to be handed them directly or theme presets skip it.
  const themeVars = resolveThemeVars(
    "pink",
    customFields,
  ) as React.CSSProperties | null;

  const accentWord = f["pink.global.accent-word"] ?? "";
  const wordmark = splitAccentWordmark(businessName, accentWord);

  const ctaText = (f["pink.global.header-cta-text"] ?? "").trim();
  const ctaLink = f["pink.global.header-cta-link"] ?? "/contact";
  const basketLabel = f["pink.global.basket-label"] ?? "Basket";

  // Shipped nav, used until the owner saves their own items in
  // /admin/content/navigation. Gated per entry: a default link to a page the
  // store has switched off would 404. Contact is ungated, matching the
  // footer's fallback column.
  const DEFAULT_NAV: PinkNavLink[] = [
    { href: "/shop", label: "Shop" },
    ...(isEnabled("collections")
      ? [{ href: "/collections", label: "Collections" }]
      : []),
    ...(isEnabled("services")
      ? [{ href: "/services", label: "Make & Takes" }]
      : []),
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Journal" }] : []),
    ...(isEnabled("events") ? [{ href: "/events", label: "Events" }] : []),
    ...(isEnabled("videos") ? [{ href: "/videos", label: "Videos" }] : []),
    { href: "/about", label: "The artist" },
    { href: "/contact", label: "Contact" },
  ];

  // `??`, never `||` (and never a `.length` check): an owner who saves an empty
  // item list in the Navigation builder means "no nav links", which either of
  // those would silently overwrite with the shipped default. Owner-configured
  // items are rendered as-is — the flag gating above shapes DEFAULT_NAV only.
  const navLinks =
    (business?.siteContent?.navigationItems as PinkNavLink[] | undefined) ??
    DEFAULT_NAV;

  // The drawer is one flat level, so a parent is replaced by its children.
  const mobileLinks = navLinks.flatMap((link) =>
    link.children?.length ? link.children : [link],
  );

  const isActive = (href: string) => isActiveNavLink(pathname ?? "/", href);

  const openCart = () => setIsOpen(true);

  return (
    <>
      <header
        // z-50 matches every other template's sticky header. At z-[60] this
        // header painted OVER the cart drawer's Radix portal (overlay and
        // content are both z-50), hiding the drawer's own title bar and
        // leaving the header undimmed above the scrim.
        className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 px-5 py-[18px] md:px-10"
        style={{
          background: "var(--pink-paper)",
          borderBottom: "1px solid var(--pink-line)",
        }}
      >
        {/* ── Wordmark ── */}
        <Link
          href="/"
          className="flex min-w-0 items-baseline gap-2.5"
          aria-label={`${businessName} — Home`}
          {...sectionGroupAttr("global", "branding")}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={logoAlt}
              width={160}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          ) : (
            <span
              className="pink-display truncate"
              style={{
                fontSize: "23px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--pink-ink)",
              }}
            >
              {wordmark.matches ? (
                <>
                  {wordmark.prefix}
                  <span style={{ color: "var(--pink-rose)" }}>
                    {wordmark.tail}
                  </span>
                </>
              ) : (
                businessName
              )}
            </span>
          )}
        </Link>

        {/* ── Primary nav + right cluster ── */}
        <div
          className="flex flex-1 flex-wrap items-center justify-end gap-x-6 gap-y-3.5"
          {...sectionGroupAttr("global", "header")}
        >
          <nav
            className="hidden items-center gap-x-[22px] gap-y-2 lg:flex"
            aria-label="Primary navigation"
          >
            {navLinks.map((link) =>
              link.children?.length ? (
                // A parent with children renders as a dropdown TRIGGER and its
                // own `href` is never navigated to — the platform convention
                // every other header follows.
                <PinkNavDropdown
                  key={link.href + link.label}
                  label={link.label}
                  links={link.children}
                  activePath={pathname ?? "/"}
                />
              ) : (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className="pink-nav-link"
                >
                  {link.label}
                  {link.external && (
                    <span className="sr-only"> (opens in new tab)</span>
                  )}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isEnabled("customerAccounts") && (
              <div className="hidden lg:block">
                {isPending ? (
                  <div
                    className="h-8 w-8 animate-pulse rounded-full"
                    style={{ background: "var(--pink-line)" }}
                  />
                ) : session?.user ? (
                  <UserButton
                    size="icon"
                    className="h-auto w-auto rounded-full p-0"
                    avatarClassName="size-8 ring-1 ring-[var(--pink-rose)] ring-offset-1 ring-offset-[var(--pink-paper)]"
                    links={[
                      {
                        icon: <IconPackage className="h-4 w-4" />,
                        label: "Orders",
                        href: "/account/orders",
                      },
                      ...(showAdminLink
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
                ) : (
                  <Link
                    href="/auth/sign-in"
                    aria-label="Sign in to your account"
                    className="flex items-center justify-center"
                    style={{ color: "var(--pink-ink)" }}
                  >
                    <User className="h-[18px] w-[18px]" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}

            {isEnabled("wishlist") && (
              <Link
                href="/wishlist"
                aria-label={
                  wishlistHydrated && wishlistCount > 0
                    ? `Open wishlist, ${wishlistCount} saved ${wishlistCount === 1 ? "item" : "items"}`
                    : "Open wishlist"
                }
                // 24x24 box around an 18px glyph: the painted icon stays the
                // same size as the account icon beside it, but the target
                // clears WCAG 2.5.8's 24px AA bar. (The account icon is 18px
                // and predates this — same fix applies there, out of scope here.)
                className="relative hidden size-6 items-center justify-center lg:inline-flex"
                style={{ color: "var(--pink-ink)" }}
              >
                <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
                {wishlistHydrated && wishlistCount > 0 && (
                  <span
                    aria-hidden="true"
                    // rem, not px: the type scale is rem throughout for WCAG 1.4.4.
                    className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center px-[3px] text-[0.625rem] leading-none font-semibold"
                    style={{
                      background: "var(--pink-rose)",
                      color: "var(--pink-on-accent)",
                    }}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {ctaText && (
              <Link
                href={ctaLink}
                className="hidden text-[14px] font-medium transition-colors sm:inline-flex"
                style={{
                  border: "1px solid var(--pink-line-button)",
                  color: "var(--pink-ink)",
                  padding: "11px 16px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--pink-rose)";
                  e.currentTarget.style.color = "var(--pink-rose)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--pink-line-button)";
                  e.currentTarget.style.color = "var(--pink-ink)";
                }}
                {...fieldAttr("pink.global.header-cta-text")}
              >
                {ctaText}
              </Link>
            )}

            <button
              type="button"
              onClick={openCart}
              aria-label={
                itemCount > 0
                  ? `Open basket, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                  : "Open basket"
              }
              className="inline-flex items-center gap-2 text-[14px] font-semibold transition-colors"
              style={{
                background: "var(--pink-rose)",
                border: "1px solid var(--pink-rose)",
                color: "var(--pink-on-accent)",
                padding: "11px 20px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--pink-ink)";
                e.currentTarget.style.borderColor = "var(--pink-ink)";
                e.currentTarget.style.color = "var(--pink-paper)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--pink-rose)";
                e.currentTarget.style.borderColor = "var(--pink-rose)";
                e.currentTarget.style.color = "var(--pink-on-accent)";
              }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span {...fieldAttr("pink.global.basket-label")}>
                {basketLabel}
              </span>
              {/* `opacity: 0.7` composited white onto `--pink-rose` at 4.05:1,
                  under AA. 0.85 measures 5.29:1 and keeps the de-emphasis
                  (full white is 6.7:1). `aria-hidden` because the button's
                  aria-label already announces the item count. */}
              {itemCount > 0 && (
                <span aria-hidden="true" style={{ opacity: 0.85 }}>
                  ({itemCount})
                </span>
              )}
            </button>

            <button
              ref={hamburgerRef}
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls={mobileMenuId}
              onClick={() => setMobileOpen(true)}
              // The 40x40 box is optical, not arbitrary: it centres the icon
              // against the basket button beside it and keeps the header row
              // at its designed height. It clears WCAG 2.5.8 (24px AA) but
              // sits under the template's own 44px bar, so on touch pointers
              // only, a 2px `::after` ring extends the *hit area* to 44x44
              // while the painted box, and therefore the header layout,
              // stays exactly as designed (audit 2026-07-31, P3-1). The
              // 12px `gap-3` to the basket button leaves 8px of clearance,
              // so the expanded areas never overlap.
              className="relative flex h-10 w-10 items-center justify-center lg:hidden [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:-inset-0.5 [@media(pointer:coarse)]:after:content-['']"
              style={{ color: "var(--pink-ink)" }}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <PinkMobileMenu
        id={mobileMenuId}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        triggerRef={hamburgerRef}
        links={mobileLinks}
        activeHref={pathname ?? "/"}
        ctaText={ctaText}
        ctaLink={ctaLink}
        basketLabel={basketLabel}
        itemCount={itemCount}
        wishlist={
          isEnabled("wishlist")
            ? { count: wishlistCount, hydrated: wishlistHydrated }
            : null
        }
        account={
          isEnabled("customerAccounts") && !isPending
            ? {
                href: session?.user ? "/account/orders" : "/auth/sign-in",
                label: session?.user ? "My account" : "Sign in",
              }
            : null
        }
        onOpenCart={() => {
          setMobileOpen(false);
          openCart();
        }}
      />

      <PinkCartDrawer themeVars={themeVars ?? undefined} />
    </>
  );
}
