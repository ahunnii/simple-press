"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Heart, Menu, ShoppingBag, User } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { cn } from "~/lib/utils";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooMobileNav } from "./bamboo-mobile-nav";

export type NavChild = { label: string; href: string; external?: boolean };
export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

export function BambooHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const { isEnabled } = useStorefrontFlags();

  const [stuck, setStuck] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Stable identity: `BambooMobileNav` subscribes document/matchMedia
  // listeners keyed on this callback, and an inline arrow would tear them all
  // down and rebuild them on every `stuck` toggle — i.e. on every scroll past
  // 8px while the menu is open.
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Transparent-over-sage at the top of the page; gains the paper scrim +
  // blur + shadow once the page scrolls (see `--bamboo-header-offset` and the
  // hero pull-under convention in the F1 build report).
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close desktop dropdown on Escape, returning focus to its trigger
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

  // Escape and focus return for the mobile menu live in `BambooMobileNav` —
  // it owns the dialog contract (trap, inert, scroll lock) and Escape has to
  // be part of that same listener, not a competing one up here.

  // Close everything on route change
  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  const DEFAULT_NAV_LINKS: NavLink[] = [
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop" }] : []),
    { href: "/about", label: "About" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Insights" }] : []),
    { href: "/contact", label: "Contact" },
  ];

  // `??`, never `||`: an owner who saves an empty nav list means "no custom
  // nav", which `||` would silently overwrite with the shipped default.
  const customNav = business?.siteContent?.navigationItems as
    | NavLink[]
    | undefined;
  const links = customNav ?? DEFAULT_NAV_LINKS;

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const businessName = business?.name ?? "Business";

  return (
    <>
      <header
        className="sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300"
        style={{
          background: stuck
            ? "color-mix(in srgb, var(--bamboo-paper) 92%, transparent)"
            : "transparent",
          backdropFilter: stuck ? "blur(9px)" : "none",
          boxShadow: stuck
            ? "0 10px 30px -26px color-mix(in srgb, var(--bamboo-ink) 75%, transparent)"
            : "none",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-[18px]">
          <Link
            href="/"
            className="inline-flex items-center gap-[11px] text-[var(--bamboo-pine)]"
            aria-label={`${businessName} — home`}
          >
            {/* Brand role is ALWAYS the wreath mark (decisions log: wreath
              everywhere; the uploaded logo image is not used in chrome). */}
            <BambooGlyph id="s-wreath" className="h-9 w-auto shrink-0" />
            <b className="font-heading text-[1.28rem] leading-none font-bold tracking-[-0.02em]">
              {businessName}
            </b>
          </Link>

          <nav
            className="ml-auto hidden items-center gap-[30px] min-[901px]:flex"
            aria-label="Primary"
          >
            {links.map((link, i) =>
              link.children?.length ? (
                <div
                  key={link.href + link.label}
                  className="relative flex items-center"
                  onMouseEnter={() => setOpenDropdown(i)}
                  onMouseLeave={() => setOpenDropdown(null)}
                  onBlur={(e) => {
                    if (
                      !e.currentTarget.contains(e.relatedTarget as Node | null)
                    ) {
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
                    aria-expanded={openDropdown === i}
                    aria-controls={`bamboo-nav-dropdown-${i}`}
                    onClick={() =>
                      setOpenDropdown(openDropdown === i ? null : i)
                    }
                    data-current={
                      link.children.some((c) => isActive(c.href))
                        ? "true"
                        : undefined
                    }
                    className={cn(
                      "bamboo-nav-link flex cursor-pointer items-center gap-1 border-none bg-transparent p-0",
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
                  </button>

                  {openDropdown === i && (
                    <div
                      id={`bamboo-nav-dropdown-${i}`}
                      className="absolute top-full left-0 z-10 pt-3"
                    >
                      <div className="bamboo-nav-dropdown">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            target={child.external ? "_blank" : undefined}
                            rel={
                              child.external ? "noopener noreferrer" : undefined
                            }
                            aria-current={
                              isActive(child.href) ? "page" : undefined
                            }
                            data-current={
                              isActive(child.href) ? "true" : undefined
                            }
                            onClick={() => setOpenDropdown(null)}
                            className="bamboo-nav-dropdown-link"
                          >
                            {child.label}
                            {child.external && (
                              <span className="sr-only">
                                {" "}
                                (opens in new tab)
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  data-current={isActive(link.href) ? "true" : undefined}
                  className="bamboo-nav-link"
                >
                  {link.label}
                  {link.external && (
                    <span className="sr-only"> (opens in new tab)</span>
                  )}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2 min-[901px]:ml-0">
            {isEnabled("customerAccounts") &&
              (isPending ? (
                <div className="size-11 animate-pulse rounded-full bg-[var(--bamboo-sage)]" />
              ) : session?.user ? (
                <UserButton
                  size="icon"
                  className="bamboo-icon-btn"
                  avatarClassName="size-6"
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
                  className="bamboo-icon-btn"
                >
                  <User
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </Link>
              ))}

            {isEnabled("wishlist") && (
              <Link
                href="/wishlist"
                aria-label={
                  wishlistCount > 0
                    ? `Wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`
                    : "Wishlist"
                }
                className="bamboo-icon-btn"
              >
                <Heart
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {wishlistCount > 0 && (
                  <span aria-hidden="true" className="bamboo-icon-badge">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/cart"
              aria-label={
                itemCount > 0
                  ? `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                  : "Cart"
              }
              className="bamboo-icon-btn"
            >
              <ShoppingBag
                className="h-[18px] w-[18px]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {itemCount > 0 && (
                <span aria-hidden="true" className="bamboo-icon-badge">
                  {itemCount}
                </span>
              )}
            </Link>

            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="bamboo-mobile-nav"
              // `bamboo-d-hide`, never `min-[901px]:hidden`: `.bamboo
              // .bamboo-icon-btn { display: inline-flex }` is UNLAYERED and so
              // out-specifies every layered Tailwind display utility. Never pair
              // a Tailwind display utility with a `.bamboo-*` class that sets
              // display.
              className="bamboo-icon-btn bamboo-d-hide"
            >
              <Menu
                className="h-[18px] w-[18px]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </header>

      {/* A SIBLING of the header, never a child: once `stuck` sets a non-none
          `backdrop-filter` on <header>, that header becomes the containing
          block for any `position: fixed` descendant — the full-screen dialog
          would shrink to the header strip the moment the page scrolls. Here it
          sits under the same `.bamboo` root as <main> and <footer>, so it
          keeps every design token without a portal. */}
      <BambooMobileNav
        id="bamboo-mobile-nav"
        open={mobileOpen}
        onClose={closeMobile}
        links={links}
        isActive={isActive}
        triggerRef={burgerRef}
        businessName={businessName}
        phone={business?.phoneNumber}
        email={business?.supportEmail}
      />
    </>
  );
}
