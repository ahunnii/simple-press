"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Heart, Menu, ShoppingBag, User } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { resolveFields } from "../index";
import { UmscNavDialog } from "./umsc-nav-dialog";

export type UmscNavChild = { label: string; href: string; external?: boolean };
export type UmscNavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: UmscNavChild[];
};

export function UmscHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [cartBump, setCartBump] = useState(false);
  const prevItemCount = useRef(itemCount);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 320);
      prevItemCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest("[data-umsc-dropdown]")) setOpenDropdown(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openDropdown]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();

  const DEFAULT_NAV_LINKS: UmscNavLink[] = [
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop" }] : []),
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ];

  const customNav = business?.siteContent?.navigationItems as
    | UmscNavLink[]
    | undefined;
  const links = customNav ?? DEFAULT_NAV_LINKS;

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, [
    "umsc.global.header-tagline",
    "umsc.global.customer-service-phone",
  ]);
  const tagline = g["umsc.global.header-tagline"] ?? "Home essentials";
  // Business-record-first, field-as-override — same rule `umsc-footer.tsx`
  // applies to this same field: `||`, not `??`, since a cleared field ("")
  // must fall through to the business record.
  const phone =
    (g["umsc.global.customer-service-phone"] ?? "").trim() ||
    (business?.phoneNumber ?? "");

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );
  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  };

  const brand = (
    <span className="flex items-center gap-3">
      <span className="relative size-[52px] shrink-0 overflow-hidden rounded-full border border-[var(--umsc-line-gold)]">
        <Image
          src={logoUrl ?? "/placeholder.svg"}
          alt={logoAlt}
          fill
          sizes="52px"
          className="object-cover"
        />
      </span>
      <span className="flex flex-col items-start">
        <span className="umsc-serif text-[24px] leading-none text-[var(--umsc-gold-soft)]">
          {businessName}
        </span>
        {tagline && (
          <span
            {...fieldAttr("umsc.global.header-tagline")}
            className="umsc-sans mt-1 text-[11px] tracking-[0.08em] text-[var(--umsc-cream-on-black)] uppercase"
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );

  const renderDesktopLink = (link: UmscNavLink) => {
    const active = isActive(link.href);

    if (link.children?.length) {
      const isOpen = openDropdown === link.href;
      const childActive = link.children.some((c) => isActive(c.href));
      return (
        <div
          key={link.href + link.label}
          data-umsc-dropdown
          className="relative flex items-center"
          onMouseEnter={() => setOpenDropdown(link.href)}
          onMouseLeave={() => setOpenDropdown(null)}
        >
          <Link
            href={link.href}
            data-current={childActive ? "true" : undefined}
            aria-current={childActive ? "page" : undefined}
            className="umsc-nav-link umsc-sans inline-flex items-center gap-1 py-2 text-[12px] font-semibold tracking-[0.13em] text-[var(--umsc-cream)] uppercase no-underline"
          >
            {link.label}
            <ChevronDown
              className="size-3"
              aria-hidden="true"
              style={{
                transform: isOpen ? "rotate(180deg)" : undefined,
                transition: "transform .2s var(--umsc-ease)",
              }}
            />
          </Link>
          {isOpen && (
            <div className="absolute top-full left-0 z-10 min-w-[200px] border border-[var(--umsc-line-gold)] bg-[var(--umsc-black)] py-2">
              {link.children.map((child) => (
                <Link
                  key={child.href + child.label}
                  href={child.href}
                  onClick={() => setOpenDropdown(null)}
                  className="umsc-sans block px-4 py-2.5 text-[12px] tracking-[0.1em] whitespace-nowrap text-[var(--umsc-cream-on-black)] uppercase no-underline hover:text-[var(--umsc-gold-soft)]"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={link.href + link.label}
        href={link.href}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        aria-current={active ? "page" : undefined}
        data-current={active ? "true" : undefined}
        className="umsc-nav-link umsc-sans inline-flex items-center py-2 text-[12px] font-semibold tracking-[0.13em] text-[var(--umsc-cream)] uppercase no-underline"
      >
        {link.label}
        {link.external && <span className="sr-only"> (opens in new tab)</span>}
      </Link>
    );
  };

  return (
    <>
      <header
        {...sectionGroupAttr("global", "branding")}
        className="umsc-header sticky top-0 z-50 w-full bg-[var(--umsc-black)]"
      >
        <div
          className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-6 transition-[padding] duration-[250ms] sm:px-8"
          style={{ paddingBlock: scrolled ? "10px" : "18px" }}
        >
          <div className="flex items-center gap-3">
            <button
              ref={hamburgerRef}
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="flex size-[44px] items-center justify-center text-[var(--umsc-cream)] min-[960px]:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <Link
              href="/"
              aria-label={`${businessName} — Home`}
              className="shrink-0"
            >
              {brand}
            </Link>
          </div>

          <nav
            className="hidden items-center gap-8 min-[960px]:flex"
            aria-label="Primary navigation"
          >
            {links.map(renderDesktopLink)}
          </nav>

          <div className="flex items-center gap-5">
            {isStorefrontEnabled("customerAccounts") && (
              <div className="hidden min-[960px]:block">
                {isPending ? (
                  <div className="size-7 animate-pulse rounded-full bg-[var(--umsc-line-gold)]" />
                ) : session?.user ? (
                  <UserButton
                    size="icon"
                    className="h-auto w-auto rounded-full p-0"
                    avatarClassName="size-7 ring-1 ring-[var(--umsc-gold)] ring-offset-1 ring-offset-transparent"
                    links={[
                      {
                        icon: <IconPackage className="size-4" />,
                        label: "Orders",
                        href: "/account/orders",
                      },
                      ...(showAdminLink
                        ? [
                            {
                              icon: <IconLayoutDashboard className="size-4" />,
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
                    className="-m-2 flex items-center justify-center p-2 text-[var(--umsc-cream)]"
                  >
                    <User
                      className="size-[18px]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Link>
                )}
              </div>
            )}

            {isStorefrontEnabled("wishlist") && (
              <Link
                href="/wishlist"
                aria-label={
                  wishlistCount > 0
                    ? `View wishlist, ${wishlistCount} items`
                    : "View wishlist"
                }
                className="relative -m-2 hidden items-center justify-center p-2 text-[var(--umsc-cream)] min-[960px]:flex"
              >
                <Heart
                  className="size-[18px]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {wishlistCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="umsc-sans absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-[var(--umsc-gold)] text-[9px] font-semibold text-[var(--umsc-black)]"
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {isEnabled("products") && (
              <Link
                href="/cart"
                aria-label={
                  itemCount > 0 ? `View cart, ${itemCount} items` : "View cart"
                }
                className="relative -m-2 flex items-center justify-center p-2 text-[var(--umsc-cream)]"
              >
                <ShoppingBag
                  className="size-[18px]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {itemCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="umsc-cart-badge umsc-sans absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-[var(--umsc-gold)] text-[9px] font-semibold text-[var(--umsc-black)]"
                    data-bump={cartBump || undefined}
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      <UmscNavDialog
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={links}
        businessName={businessName}
        brand={brand}
        phone={phone || undefined}
        triggerRef={hamburgerRef}
      />
    </>
  );
}
