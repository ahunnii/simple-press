"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { ChevronDown, Menu, ShoppingBag, User } from "lucide-react";
import { motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

import { NoiseCartDrawer } from "../cart-checkout/noise-cart-drawer";
import { resolveFields } from "../index";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

export function NoiseHeader({ business, session }: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  // Single nav row — owner-set navigationItems override the flag-based defaults.
  const defaultNav: NavLink[] = [
    { href: "/", label: "Home" },
    ...(isEnabled("products") ? [{ href: "/shop", label: "What's New" }] : []),
    ...(isEnabled("collections")
      ? [{ href: "/collections", label: "Collections" }]
      : []),
    { href: "/about", label: "The Studio" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Blog" }] : []),
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Testimonials" }]
      : []),
    { href: "/contact", label: "Contact" },
  ];

  const navItems =
    (business?.siteContent?.navigationItems as NavLink[]) ?? defaultNav;

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

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, ["sledge.global.footer-tagline"]);
  const footerTagline = g["sledge.global.footer-tagline"] ?? "";

  const isLinkActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const isParentActive = (link: NavLink) =>
    link.children?.some((c) => isLinkActive(c.href)) ?? false;

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "rounded-full w-auto h-auto p-0 border border-white/30",
          avatar: { base: "size-7" },
        },
      }}
      additionalLinks={[
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

  const authLink = !session?.user && (
    <Link href="/auth/sign-in" aria-label="Account">
      <User
        className="h-[18px] w-[18px] text-white/80 transition-opacity hover:opacity-70"
        strokeWidth={1.4}
      />
    </Link>
  );

  const brand = logoUrl ? (
    <div className="sl-brand-logo">
      <Image
        src={logoUrl}
        alt={businessName}
        fill
        sizes="161px"
        className="object-contain object-left"
        priority
      />
    </div>
  ) : (
    <span className="sl-brand-text font-heading leading-none">
      {businessName}
    </span>
  );

  return (
    <>
      <header className="sl-header sticky top-0 z-50 w-full">
        <div className="mx-auto grid h-[120px] w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          {/* ── Left: logo (desktop) / hamburger (mobile) ── */}
          <div className="flex items-center justify-start">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-none border border-white/20 text-white/80"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="sl-mobile-menu flex w-[min(100vw-1rem,27.5rem)] flex-col gap-0 rounded-none p-0"
              >
                <div className="border-b border-white/10 px-6 pt-12 pb-6">
                  <SheetTitle className="font-heading text-5xl leading-none text-[var(--sl-coral)]">
                    {businessName}
                  </SheetTitle>
                  {footerTagline && (
                    <SheetDescription className="mt-3 text-[15px] leading-relaxed text-white/55">
                      {footerTagline}
                    </SheetDescription>
                  )}
                </div>

                <nav
                  className="flex flex-1 flex-col gap-0 overflow-y-auto overscroll-contain p-5"
                  aria-label="Mobile navigation"
                >
                  {navItems.map((link, i) =>
                    link.children?.length ? (
                      <div
                        key={link.href + link.label}
                        className="border-b border-white/10"
                      >
                        <button
                          type="button"
                          onClick={() => toggleMobileExpanded(i)}
                          aria-expanded={
                            expandedMobile.has(i) ? "true" : "false"
                          }
                          className={cn(
                            "font-heading flex w-full items-center justify-between py-4 text-3xl transition-colors",
                            isParentActive(link)
                              ? "sl-nav-active"
                              : "sl-nav-inactive",
                          )}
                        >
                          {link.label}
                          <ChevronDown
                            className={cn(
                              "h-5 w-5 transition-transform duration-200",
                              expandedMobile.has(i) ? "rotate-180" : "",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                        {expandedMobile.has(i) && (
                          <div className="pb-3 pl-2">
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
                                onClick={() => setMobileOpen(false)}
                                aria-current={
                                  isLinkActive(child.href) ? "page" : undefined
                                }
                                className={cn(
                                  "font-heading block py-2.5 text-2xl transition-colors",
                                  isLinkActive(child.href)
                                    ? "sl-nav-active"
                                    : "sl-nav-inactive",
                                )}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        key={link.href + link.label}
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        onClick={() => setMobileOpen(false)}
                        aria-current={
                          isLinkActive(link.href) ? "page" : undefined
                        }
                        className={cn(
                          "font-heading flex items-center border-b border-white/10 py-4 text-3xl transition-colors",
                          isLinkActive(link.href)
                            ? "sl-nav-active"
                            : "sl-nav-inactive",
                        )}
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </nav>

                <div className="flex items-center justify-between border-t border-white/10 px-7 py-5">
                  {session?.user ? (
                    <div className="flex items-center gap-4">
                      {userMenu}
                      <span className="text-[13.75px] tracking-[0.14em] text-white/50 uppercase">
                        Account
                      </span>
                    </div>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      onClick={() => setMobileOpen(false)}
                      className="text-[15px] font-semibold tracking-[0.14em] text-white/60 uppercase transition-colors hover:opacity-80"
                    >
                      Login →
                    </Link>
                  )}
                  <span className="text-[13.75px] tracking-[0.14em] text-white/40 uppercase">
                    {new Date().getFullYear()}
                  </span>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo (desktop) */}
            <Link href="/" aria-label="Home" className="hidden md:flex">
              {brand}
            </Link>
          </div>

          {/* ── Center: logo (mobile only) ── */}
          <div className="flex items-center justify-center">
            <Link
              href="/"
              aria-label="Home"
              className="flex justify-center md:hidden"
            >
              {brand}
            </Link>
          </div>

          {/* ── Right: nav (desktop) + account + bag ── */}
          <div className="flex items-center justify-end gap-5">
            <nav
              className="hidden flex-nowrap items-center gap-[43.75px] md:flex lg:gap-10"
              aria-label="Primary navigation"
            >
              {navItems.map((link, i) =>
                link.children?.length ? (
                  <div
                    key={link.href + link.label}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(i)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={openDropdown === i ? "true" : "false"}
                      onClick={() =>
                        setOpenDropdown(openDropdown === i ? null : i)
                      }
                      className={cn(
                        "vn-nav-link font-heading flex cursor-pointer items-center gap-1 border-none bg-transparent text-[27.5px] leading-none whitespace-nowrap transition-colors",
                        isParentActive(link)
                          ? "vn-active sl-nav-active"
                          : "sl-nav-inactive",
                      )}
                    >
                      {link.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          openDropdown === i ? "rotate-180" : "",
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {openDropdown === i && (
                      <div className="absolute top-full left-0 z-10 pt-2">
                        <div className="sl-dropdown-panel min-w-[200px] overflow-hidden rounded-none py-1 shadow-lg">
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
                                isLinkActive(child.href) ? "page" : undefined
                              }
                              onClick={() => setOpenDropdown(null)}
                              className={cn(
                                "vn-nav-dropdown-link font-heading text-[22px] leading-none",
                                isLinkActive(child.href) ? "vn-active" : "",
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    aria-current={isLinkActive(link.href) ? "page" : undefined}
                    className={cn(
                      "vn-nav-link font-heading text-[27.5px] leading-none whitespace-nowrap transition-colors",
                      isLinkActive(link.href)
                        ? "vn-active sl-nav-active"
                        : "sl-nav-inactive",
                    )}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>

            {session?.user ? userMenu : authLink}

            <Link
              href="/cart"
              aria-label="Open cart"
              className="relative flex items-center text-white/80 transition-opacity hover:opacity-70"
            >
              <ShoppingBag className="h-[25px] w-[25px]" strokeWidth={1.4} />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="sl-cart-badge absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[11.25px] font-semibold"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <NoiseCartDrawer shippingConfig={shippingConfigFromBusiness(business)} />
    </>
  );
}
