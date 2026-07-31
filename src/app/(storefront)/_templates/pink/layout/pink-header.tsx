"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Menu, ShoppingBag, User } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { resolveThemeVars } from "~/lib/template-themes";

import { resolveFields } from "..";
import { PinkCartDrawer } from "../shared/pink-cart-drawer";
import { isActiveNavLink } from "./pink-nav-utils";
import { PinkMobileMenu } from "./pink-mobile-menu";

export type PinkNavLink = { href: string; label: string; fieldKey?: string };

const FIELD_KEYS = [
  "pink.global.accent-word",
  "pink.global.locality-tag",
  "pink.global.nav-shop",
  "pink.global.nav-collections",
  "pink.global.nav-services",
  "pink.global.nav-blog",
  "pink.global.nav-about",
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
  if (!trimmedAccent || !name.toLowerCase().endsWith(trimmedAccent.toLowerCase())) {
    return { matches: false as const };
  }
  const splitIndex = name.length - trimmedAccent.length;
  return {
    matches: true as const,
    prefix: name.slice(0, splitIndex),
    tail: name.slice(splitIndex),
  };
}

export function PinkHeader({ business, session }: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const { itemCount, setIsOpen } = useCart();
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
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);
  // The cart drawer portals outside the layout wrapper that carries these, so
  // it has to be handed them directly or theme presets skip it.
  const themeVars = resolveThemeVars("pink", customFields) as
    | React.CSSProperties
    | null;

  const accentWord = f["pink.global.accent-word"] ?? "";
  const localityTag = f["pink.global.locality-tag"] ?? "";
  const wordmark = splitAccentWordmark(businessName, accentWord);

  const ctaText = (f["pink.global.header-cta-text"] ?? "").trim();
  const ctaLink = f["pink.global.header-cta-link"] ?? "/testimonials";
  const basketLabel = f["pink.global.basket-label"] ?? "Basket";

  const defaultNavLinks: PinkNavLink[] = [
    {
      href: "/shop",
      label: f["pink.global.nav-shop"] ?? "Shop",
      fieldKey: "pink.global.nav-shop",
    },
    ...(isEnabled("collections")
      ? [
          {
            href: "/collections",
            label: f["pink.global.nav-collections"] ?? "Collections",
            fieldKey: "pink.global.nav-collections",
          },
        ]
      : []),
    ...(isEnabled("services")
      ? [
          {
            href: "/services",
            label: f["pink.global.nav-services"] ?? "Make & Takes",
            fieldKey: "pink.global.nav-services",
          },
        ]
      : []),
    ...(isEnabled("blog")
      ? [
          {
            href: "/blog",
            label: f["pink.global.nav-blog"] ?? "Journal",
            fieldKey: "pink.global.nav-blog",
          },
        ]
      : []),
    {
      href: "/about",
      label: f["pink.global.nav-about"] ?? "The artist",
      fieldKey: "pink.global.nav-about",
    },
  ];

  const customNav = business?.siteContent?.navigationItems as
    | PinkNavLink[]
    | undefined;
  const navLinks = customNav?.length ? customNav : defaultNavLinks;

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
          background: "var(--pink-ink)",
          borderBottom: "1px solid var(--pink-ink-line)",
        }}
      >
        {/* ── Wordmark + locality ── */}
        <Link
          href="/"
          className="flex min-w-0 items-baseline gap-2.5"
          aria-label={`${businessName} — Home`}
          {...sectionGroupAttr("global", "branding")}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
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
                color: "var(--pink-paper)",
              }}
            >
              {wordmark.matches ? (
                <>
                  {wordmark.prefix}
                  <span style={{ color: "var(--pink-blush)" }}>{wordmark.tail}</span>
                </>
              ) : (
                businessName
              )}
            </span>
          )}
          {localityTag && (
            <span
              className="shrink-0 text-[11px] font-medium tracking-[0.2em] uppercase"
              style={{ color: "var(--pink-ink-subtle)" }}
              {...fieldAttr("pink.global.locality-tag")}
            >
              {localityTag}
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
            {navLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className="pink-nav-link"
                {...(link.fieldKey ? fieldAttr(link.fieldKey) : {})}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isEnabled("customerAccounts") && (
              <div className="hidden lg:block">
                {session?.user ? (
                  <UserButton
                    size="icon"
                    classNames={{
                      trigger: {
                        base: "rounded-full w-auto h-auto p-0",
                        avatar: {
                          base: "size-8 ring-1 ring-[var(--pink-blush)] ring-offset-1 ring-offset-[var(--pink-ink)]",
                        },
                      },
                    }}
                    additionalLinks={[
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
                    style={{ color: "var(--pink-paper)" }}
                  >
                    <User className="h-[18px] w-[18px]" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}

            {ctaText && (
              <Link
                href={ctaLink}
                className="hidden text-[14px] font-medium transition-colors sm:inline-flex"
                style={{
                  border: "1px solid var(--pink-ink-line-strong)",
                  color: "var(--pink-paper)",
                  padding: "11px 16px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--pink-blush)";
                  e.currentTarget.style.color = "var(--pink-blush)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--pink-ink-line-strong)";
                  e.currentTarget.style.color = "var(--pink-paper)";
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
                e.currentTarget.style.background = "var(--pink-paper)";
                e.currentTarget.style.borderColor = "var(--pink-paper)";
                e.currentTarget.style.color = "var(--pink-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--pink-rose)";
                e.currentTarget.style.borderColor = "var(--pink-rose)";
                e.currentTarget.style.color = "var(--pink-on-accent)";
              }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span {...fieldAttr("pink.global.basket-label")}>{basketLabel}</span>
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
              className="flex h-10 w-10 items-center justify-center lg:hidden"
              style={{ color: "var(--pink-paper)" }}
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
        links={navLinks}
        activeHref={pathname ?? "/"}
        ctaText={ctaText}
        ctaLink={ctaLink}
        basketLabel={basketLabel}
        itemCount={itemCount}
        account={
          isEnabled("customerAccounts")
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
