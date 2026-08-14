"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { isActiveNavLink } from "~/lib/nav-utils";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/auth/user/user-button";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { resolveFields } from "..";
import { relocationTelHref } from "../shared/relocation-phone";
import { RelocationPillButton } from "../shared/relocation-pill-button";
import { RelocationAboutDropdown } from "./relocation-about-dropdown";
import { RelocationMobileMenu } from "./relocation-mobile-menu";

/** Platform nav shape — `Business.siteContent.navigationItems` (one level of
 *  children), as validated by `navigationItemsSchema` in
 *  `src/lib/validators/content.ts` and mirrored by every other header. */
type NavChild = { label: string; href: string; external?: boolean };
type NavLink = NavChild & { children?: NavChild[] };

/**
 * The clone's nav, reproduced exactly, used until the owner saves their own
 * items in /admin/content/navigation. "About Us" is a parent whose `href` is
 * never navigated to — see the render comment below.
 */
const DEFAULT_NAV: NavLink[] = [
  {
    label: "About Us",
    href: "/about",
    children: [
      { label: "Backstory", href: "/about" },
      { label: "Reviews", href: "/testimonials" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  { label: "Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
];

/**
 * White, tall header (design.md → Chrome): circular Handy badge left, then a
 * right-aligned "About Us ▾" dropdown, Services, Contact Us, and the terracotta
 * "CALL US AT (313) 241-0291" pill.
 *
 * Both of those right-hand clusters read platform data rather than template
 * fields: the nav comes from `siteContent.navigationItems`
 * (/admin/content/navigation), the phone number from `Business.phoneNumber`
 * (Settings → General). The only field left here is the call pill's prefix
 * ("CALL US AT") plus the shipped fallback logo.
 *
 * Client component because it needs `usePathname()` for the active-link
 * underline, holds the mobile drawer's open state, and reads the session
 * through `useHydratedSession(initialSession)` — seeded with the layout's
 * server-side `getSession()` so the signed-in header is right in the first
 * paint, then handed over to the client store so a post-login (or post-logout)
 * client navigation flips it without a hard refresh.
 *
 * Breakpoint: the clone's desktop starts at 1025px, so the hamburger owns
 * everything below that (`max-[1024px]:` / `min-[1025px]:` arbitrary variants —
 * the Tailwind config is never touched).
 */
export function RelocationHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();

  const { isEnabled } = useStorefrontFlags();
  const { data: session, isPending } = useHydratedSession(initialSession);

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "relocation.global.branding.logo",
    "relocation.global.branding.call-cta-prefix",
  ]);

  const businessName = business?.name ?? "Handy Relocations";
  // Owner-uploaded logo wins, as in every other template's header; the clone
  // badge is the shipped default.
  const logoSrc =
    business?.siteContent?.logoUrl ??
    f["relocation.global.branding.logo"] ??
    "";
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );

  // `??`, never `||`: an owner who saves an empty item list in the Navigation
  // builder means "no nav links", which `||` would silently overwrite with the
  // shipped default.
  const links =
    (business?.siteContent?.navigationItems as NavLink[] | undefined) ??
    DEFAULT_NAV;

  // The drawer is one flat level (design.md deviation #2), so parents are
  // replaced by their children — for DEFAULT_NAV that is exactly today's list:
  // Backstory / Reviews / FAQ / Services / Contact Us.
  const mobileLinks = links.flatMap((link) =>
    link.children?.length ? link.children : [link],
  );

  const phone = business?.phoneNumber ?? "";
  const phoneHref = relocationTelHref(phone);
  const callPrefix = f["relocation.global.branding.call-cta-prefix"] ?? "";
  // Composite label for the drawer pill, which carries no editor hotspot.
  const phoneLabel = [callPrefix, phone].filter(Boolean).join(" ");

  const navLinkClass = (href: string) =>
    cn(
      "relocation-hover-fade relocation-nav-link py-1 [font-family:var(--font-relocation-display)] text-[1.0625rem] leading-6 text-[var(--relocation-ink)]",
      isActiveNavLink(pathname, href) && "relocation-nav-link--active",
    );

  const authActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-[var(--relocation-ink)] hover:bg-[var(--relocation-ink)]/10 hover:text-[var(--relocation-ink)]"
      >
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-[var(--relocation-ink)] hover:bg-[var(--relocation-ink)]/10 hover:text-[var(--relocation-ink)]"
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

  // Desktop cluster: full ghost buttons / avatar dropdown, next to the nav.
  // The pulse placeholder holds the avatar's footprint during the session
  // fetch so the row doesn't shift when the real state resolves.
  const accountSlot = isEnabled("customerAccounts") ? (
    isPending ? (
      <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--relocation-ink)]/10" />
    ) : session?.user ? (
      userMenu
    ) : (
      authActions
    )
  ) : null;

  // Mobile drawer: collapses to one pill link rather than squeezing the
  // above into the drawer's top bar (see RelocationMobileMenu's account
  // props doc comment — mirrors ViiHeader's mobile pattern). Left undefined
  // while the session is pending, which drops the row entirely — the drawer
  // has no room for a placeholder, and a link whose destination is the
  // session state is worse wrong than late.
  const showMobileAccount = isEnabled("customerAccounts") && !isPending;
  const mobileAccountHref = showMobileAccount
    ? session?.user
      ? "/account/orders"
      : "/auth/sign-in"
    : undefined;
  const mobileAccountLabel = showMobileAccount
    ? session?.user
      ? "My Account"
      : "Log In"
    : undefined;

  return (
    <header
      {...sectionGroupAttr("global", "branding")}
      className="relative z-40 w-full bg-[var(--relocation-paper)]"
    >
      <div className="mx-auto flex w-full max-w-[85rem] items-center justify-between gap-6 px-6 py-4 min-[572px]:px-10 min-[1025px]:px-16 min-[1025px]:py-5">
        <Link
          href="/"
          aria-label={`${businessName} — Home`}
          className="relocation-hover-fade block shrink-0"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={logoAlt}
              width={560}
              height={603}
              // No rounded-full: the badge's script wordmark breaks outside
              // the circle, and the shipped asset is trimmed to content
              // (design.md → Chrome). Sized to the reference's visible art.
              className="block h-auto w-[4.5rem] object-contain min-[1025px]:w-[6.5rem]"
            />
          ) : (
            <span className="[font-family:var(--font-relocation-display)] text-[1.5rem] leading-8 font-bold text-[var(--relocation-ink)]">
              {businessName}
            </span>
          )}
        </Link>

        {/* ── Desktop nav + account cluster — ≥1025px ─────────────────────
            Both live in one flex item so the outer row's `justify-between`
            still balances to exactly two clusters (logo left, everything
            else right) instead of splitting the nav away from the phone
            pill once a third top-level child is added. */}
        <div className="hidden items-center gap-7 min-[1025px]:flex">
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-7"
          >
            {links.map((item) =>
              item.children?.length ? (
                // A parent with children renders as a dropdown TRIGGER and its
                // own `href` is never navigated to — the platform convention
                // every other header follows (see `noise-header.tsx`), and what
                // the clone's inert "About Us ▾" button did.
                <RelocationAboutDropdown
                  key={item.href + item.label}
                  label={item.label}
                  links={item.children}
                  activePath={pathname}
                />
              ) : (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={navLinkClass(item.href)}
                  aria-current={
                    isActiveNavLink(pathname, item.href) ? "page" : undefined
                  }
                >
                  {item.label}
                  {item.external && (
                    <span className="sr-only">(opens in new tab)</span>
                  )}
                </Link>
              ),
            )}
            {/* No phone number on the business record → no pill at all, rather
                than a dead `href="tel:"`. */}
            {phoneHref !== "" && (
              <RelocationPillButton
                href={phoneHref}
                variant="solid"
                className="ml-1"
              >
                {/* The pill's text is composite (prefix + platform phone), so
                    only the prefix carries a `fieldAttr` hotspot — the editor
                    patches an annotated element's ENTIRE textContent. */}
                <span
                  {...fieldAttr("relocation.global.branding.call-cta-prefix")}
                >
                  {callPrefix}
                </span>
                {callPrefix === "" ? null : " "}
                {phone}
              </RelocationPillButton>
            )}
          </nav>

          {accountSlot && (
            <div className="flex items-center gap-2 border-l border-[var(--relocation-border)] pl-6">
              {accountSlot}
            </div>
          )}
        </div>
        {/* ── Hamburger — <1025px ───────────────────────────────────────── */}
        <button
          ref={hamburgerRef}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls={mobileMenuId}
          onClick={() => setMobileOpen(true)}
          className="relocation-hover-fade flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--relocation-ink)] min-[1025px]:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 28 18"
            width={28}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="block"
          >
            <path d="M1 5.5H27M1 12.5H27" />
          </svg>
        </button>
      </div>

      <RelocationMobileMenu
        id={mobileMenuId}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={mobileLinks}
        phoneLabel={phoneLabel}
        phoneHref={phoneHref}
        activePath={pathname}
        triggerRef={hamburgerRef}
        accountHref={mobileAccountHref}
        accountLabel={mobileAccountLabel}
      />
    </header>
  );
}
