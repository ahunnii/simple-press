"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "~/components/auth/user/user-button";
import { IconPackage } from "@tabler/icons-react";
import { ChevronDown, LayoutDashboardIcon, Menu, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

import { DefaultCartBadge } from "../cart-checkout/default-cart-badge";
import { DefaultWishlistBadge } from "../cart-checkout/default-wishlist-badge";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

export function DefaultHeader({ business }: DefaultHeaderTemplateProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Set<number>>(new Set());
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);
  // Ref for the first mobile nav item's toggle button (when first item has children)
  const firstNavToggleRef = useRef<HTMLButtonElement>(null);
  // Refs map for desktop dropdown trigger buttons (keyed by index)
  const dropdownTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Move focus into menu when it opens
  useEffect(() => {
    if (mobileOpen) {
      const t = setTimeout(() => {
        // Prefer the toggle button ref (set when first item has children),
        // then the link ref (set when first item is a plain link),
        // then fall back to querying the first focusable element in the nav.
        if (firstNavToggleRef.current) {
          firstNavToggleRef.current.focus();
        } else if (firstNavLinkRef.current) {
          firstNavLinkRef.current.focus();
        } else {
          const nav = document.getElementById("mobile-nav");
          const first = nav?.querySelector<HTMLElement>(
            "a[href], button:not([disabled])",
          );
          first?.focus();
        }
      }, 50);
      return () => clearTimeout(t);
    }
  }, [mobileOpen]);

  // Close on Escape and return focus; trap Tab/Shift+Tab within the mobile nav
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key === "Tab") {
        const nav = document.getElementById("mobile-nav");
        if (!nav) return;
        const focusable = Array.from(
          nav.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Close desktop dropdown on Escape and restore focus to the trigger
  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const triggerEl = dropdownTriggerRefs.current.get(openDropdown);
        setOpenDropdown(null);
        triggerEl?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  const { data: session, isPending } = useHydratedSession();
  const user = session?.user;
  const pathname = usePathname();

  const { isEnabled } = useStorefrontFlags();

  const defaultNavLinks: NavLink[] = [
    { href: "/shop", label: "Shop" },
    { href: "/about", label: "About" },
    ...(isEnabled("services") ? [{ href: "/services", label: "Services" }] : []),
    ...(isEnabled("events") ? [{ href: "/events", label: "Events" }] : []),
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Reviews" }]
      : []),
    { href: "/contact", label: "Contact" },
  ];

  const links =
    (business?.siteContent?.navigationItems as NavLink[]) ?? defaultNavLinks;

  const toggleMobileExpanded = (index: number) => {
    setExpandedMobile((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const linkClass = (active: boolean) =>
    cn(
      "relative py-1.5 text-sm transition-colors",
      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-current after:origin-left after:transition-transform after:duration-300",
      active
        ? "text-[#0a0a0a] after:scale-x-100"
        : "text-[#6b6b6b] hover:text-[#0a0a0a] after:scale-x-0 hover:after:scale-x-100",
    );

  const userMenu = user && (
    <UserButton
      size="icon"
      className="border border-[#e8e8e8]"
      avatarClassName="size-8"
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
                icon: <LayoutDashboardIcon className="h-4 w-4" />,
                label: "Admin",
                href: "/admin",
              },
            ]
          : []),
      ]}
    />
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#e8e8e8] bg-white/96 backdrop-blur-md">
        {/* ── 3-column grid: always left | brand | right ── */}
        <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          {/* Left — hamburger (mobile) or nav links (desktop) */}
          <div className="flex items-center">
            {/* Desktop nav */}
            <nav
              className="hidden items-center gap-7 md:flex"
              aria-label="Primary navigation"
            >
              {links.map((link, i) =>
                link.children?.length ? (
                  <div
                    key={link.href + link.label}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(i)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      ref={(el) => {
                        if (el) dropdownTriggerRefs.current.set(i, el);
                        else dropdownTriggerRefs.current.delete(i);
                      }}
                      aria-haspopup="true"
                      aria-expanded={openDropdown === i}
                      aria-controls={`desktop-dropdown-${i}`}
                      onClick={() =>
                        setOpenDropdown(openDropdown === i ? null : i)
                      }
                      className={cn(
                        linkClass(
                          link.children.some((c) => pathname === c.href),
                        ),
                        "flex cursor-pointer items-center gap-1 border-none bg-transparent p-0",
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
                        id={`desktop-dropdown-${i}`}
                        className="absolute top-full left-0 z-10 pt-2"
                      >
                        <div className="min-w-[160px] overflow-hidden rounded-(--radius) border border-[#e8e8e8] bg-white shadow-sm">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              target={child.external ? "_blank" : undefined}
                              rel={
                                child.external
                                  ? "noopener noreferrer"
                                  : undefined
                              }
                              aria-current={
                                pathname === child.href ? "page" : undefined
                              }
                              onClick={() => setOpenDropdown(null)}
                              className={cn(
                                "block px-4 py-2.5 text-sm transition-colors",
                                pathname === child.href
                                  ? "bg-[#f6f6f6] text-[#0a0a0a]"
                                  : "text-[#6b6b6b] hover:bg-[#f6f6f6] hover:text-[#0a0a0a]",
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
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={linkClass(pathname === link.href)}
                  >
                    {link.label}
                    {link.external && (
                      <span className="sr-only"> (opens in new tab)</span>
                    )}
                  </Link>
                ),
              )}
            </nav>

            {/* Mobile hamburger (left side → brand stays centered) */}
            <button
              ref={hamburgerRef}
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen ? "true" : "false"}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-(--radius) text-[#0a0a0a] transition-colors hover:bg-[#f6f6f6] md:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Center — brand (always centered by the grid) */}
          <Link href="/" className="flex items-center justify-center">
            {business.siteContent?.logoUrl ? (
              <Image
                src={business.siteContent.logoUrl}
                alt={resolveLogoAlt(
                  business.siteContent?.logoAltText,
                  business.name,
                )}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
            ) : (
              <span className="font-serif text-[18px] font-semibold tracking-[-0.01em] text-[#0a0a0a]">
                {business.name}
              </span>
            )}
          </Link>

          {/* Right — cart + user/sign-in */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-[#f6f6f6]" />
            ) : user ? (
              userMenu
            ) : (
              <Link
                href="/auth/sign-in"
                className="hidden rounded-[var(--radius)] px-3 py-1.5 text-sm text-[#6b6b6b] transition-colors hover:text-[#0a0a0a] sm:block"
              >
                Sign in
              </Link>
            )}
            <DefaultWishlistBadge />
            <DefaultCartBadge />
          </div>
        </div>

        {/* ── Mobile nav drawer ── */}
        {mobileOpen && (
          <nav
            id="mobile-nav"
            aria-label="Mobile navigation"
            className="border-t border-[#e8e8e8] bg-white md:hidden"
          >
            <ul className="flex flex-col divide-y divide-[#e8e8e8] px-4">
              {links.map((link, i) => (
                <li key={link.href + link.label}>
                  {link.children?.length ? (
                    <>
                      <button
                        ref={i === 0 ? firstNavToggleRef : undefined}
                        onClick={() => toggleMobileExpanded(i)}
                        aria-expanded={expandedMobile.has(i)}
                        className={cn(
                          "flex w-full items-center justify-between py-4 text-base font-medium transition-colors",
                          link.children.some((c) => pathname === c.href)
                            ? "text-[#0a0a0a]"
                            : "text-[#6b6b6b]",
                        )}
                      >
                        {link.label}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            expandedMobile.has(i) ? "rotate-180" : "",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      {expandedMobile.has(i) && (
                        <ul className="pb-2">
                          {link.children.map((child, ci) => (
                            <li key={child.href}>
                              <Link
                                ref={
                                  i === 0 && ci === 0
                                    ? firstNavLinkRef
                                    : undefined
                                }
                                href={child.href}
                                target={child.external ? "_blank" : undefined}
                                rel={
                                  child.external
                                    ? "noopener noreferrer"
                                    : undefined
                                }
                                onClick={() => setMobileOpen(false)}
                                aria-current={
                                  pathname === child.href ? "page" : undefined
                                }
                                className={cn(
                                  "flex items-center py-2.5 pl-4 text-sm transition-colors",
                                  pathname === child.href
                                    ? "font-medium text-[#0a0a0a]"
                                    : "text-[#6b6b6b]",
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
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      ref={i === 0 ? firstNavLinkRef : undefined}
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      onClick={() => setMobileOpen(false)}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className={cn(
                        "flex items-center py-4 text-base font-medium transition-colors",
                        pathname === link.href
                          ? "text-[#0a0a0a]"
                          : "text-[#6b6b6b]",
                      )}
                    >
                      {link.label}
                      {link.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </Link>
                  )}
                </li>
              ))}

              {/* Auth row */}
              {!user && (
                <li>
                  <Link
                    href="/auth/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center py-4 text-base font-medium text-[#6b6b6b] transition-colors hover:text-[#0a0a0a]"
                  >
                    Sign in
                  </Link>
                </li>
              )}
              {user && (
                <li className="py-4">
                  <Link
                    href="/account/orders"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-[#6b6b6b] transition-colors hover:text-[#0a0a0a]"
                  >
                    My account <span aria-hidden="true">→</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
