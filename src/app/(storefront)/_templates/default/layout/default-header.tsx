"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconPackage } from "@tabler/icons-react";
import { LayoutDashboardIcon, Menu, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";

import { DefaultCartBadge } from "../cart-checkout/default-cart-badge";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/testimonials", label: "Reviews" },
  { href: "/contact", label: "Contact" },
] as const;

export function DefaultHeader({ business }: DefaultHeaderTemplateProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);

  // Move focus into menu when it opens
  useEffect(() => {
    if (mobileOpen) {
      const t = setTimeout(() => firstNavLinkRef.current?.focus(), 50);
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

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const pathname = usePathname();

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? NAV_LINKS;

  const userMenu = user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "border border-[#e8e8e8]",
          avatar: { base: "size-8" },
        },
      }}
      additionalLinks={[
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
            <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={cn(
                    "relative py-1.5 text-sm transition-colors",
                    "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-current after:origin-left after:transition-transform after:duration-300",
                    pathname === link.href
                      ? "text-[#0a0a0a] after:scale-x-100"
                      : "text-[#6b6b6b] hover:text-[#0a0a0a] after:scale-x-0 hover:after:scale-x-100",
                  )}
                >
                  {link.label}
                </Link>
              ))}
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
                alt={business.name}
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
                <li key={link.href}>
                  <Link
                    ref={i === 0 ? firstNavLinkRef : undefined}
                    href={link.href}
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
                  </Link>
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
