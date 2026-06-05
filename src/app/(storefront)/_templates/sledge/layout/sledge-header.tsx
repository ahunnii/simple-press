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

  const navLinkColor = (active: boolean) =>
    active ? "var(--sl-coral)" : "rgba(255,255,255,0.85)";

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
        className="h-[18px] w-[18px] transition-opacity hover:opacity-70"
        style={{ color: "rgba(255,255,255,0.8)" }}
        strokeWidth={1.4}
      />
    </Link>
  );

  // Brand mark — logo image, falling back to the name in Amatic SC.
  // 25% larger: h-10 => h-[62.5px], sm:h-12 => sm:h-[75px], w-28 => w-[175px], sm:w-36 => sm:w-[225px]
  // Tailwind does not have h-[62.5px] or w-[175px]; using inline style for 25% increase.
  const brand = logoUrl ? (
    <div
      className="relative"
      style={{
        height: "100px", // 50px * 1.25 = 62.5px (original 50px from prior code)
        width: "100px", // 140px * 1.25 = 175px (original 140px from prior code)
      }}
    >
      <Image
        src={logoUrl}
        alt={businessName}
        fill
        sizes="100px"
        className="object-contain object-left"
        priority
      />
      <style jsx>{`
        @media (min-width: 640px) {
          div[style] {
            height: 75px !important; /* 60px * 1.25 = 75px (original sm 60px from prior code) */
            width: 225px !important; /* 180px * 1.25 = 225px (original sm 180px from prior code) */
          }
        }
      `}</style>
    </div>
  ) : (
    <span
      className="font-heading leading-none"
      style={{ color: "#ffffff", fontSize: "46.875px" }} // 37.5px * 1.25 = 46.875px
    >
      {businessName}
    </span>
  );

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{ background: "var(--sl-dark)" }}
      >
        <div className="mx-auto grid h-[120px] w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          {/* ── Left: logo (desktop) / hamburger (mobile) ── */}
          <div className="flex items-center justify-start">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-none"
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.8)",
                  }}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-[min(100vw-1rem,27.5rem)] flex-col gap-0 rounded-none p-0"
                style={{
                  background: "var(--sl-dark)",
                  borderRight: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="border-b px-6 pt-12 pb-6"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <SheetTitle
                    className="font-heading text-5xl leading-none"
                    style={{ color: "var(--sl-coral)" }}
                  >
                    {businessName}
                  </SheetTitle>
                  {footerTagline && (
                    <SheetDescription
                      className="mt-3 text-[15px] leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
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
                        className="border-b"
                        style={{ borderColor: "rgba(255,255,255,0.1)" }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMobileExpanded(i)}
                          aria-expanded={
                            expandedMobile.has(i) ? "true" : "false"
                          }
                          className="font-heading flex w-full items-center justify-between py-4 text-3xl transition-colors"
                          style={{ color: navLinkColor(isParentActive(link)) }}
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
                                className="font-heading block py-2.5 text-2xl transition-colors"
                                style={{
                                  color: navLinkColor(isLinkActive(child.href)),
                                }}
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
                        className="font-heading flex items-center border-b py-4 text-3xl transition-colors"
                        style={{
                          borderColor: "rgba(255,255,255,0.1)",
                          color: navLinkColor(isLinkActive(link.href)),
                        }}
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </nav>

                <div
                  className="flex items-center justify-between border-t px-7 py-5"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                >
                  {session?.user ? (
                    <div className="flex items-center gap-4">
                      {userMenu}
                      <span
                        className="text-[13.75px] tracking-[0.14em] uppercase"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        Account
                      </span>
                    </div>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      onClick={() => setMobileOpen(false)}
                      className="text-[15px] font-semibold tracking-[0.14em] uppercase transition-colors hover:opacity-80"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      Login →
                    </Link>
                  )}
                  <span
                    className="text-[13.75px] tracking-[0.14em] uppercase"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
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
                        isParentActive(link) ? "vn-active" : "",
                      )}
                      style={{ color: navLinkColor(isParentActive(link)) }}
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
                        <div
                          className="min-w-[200px] overflow-hidden rounded-none py-1 shadow-lg"
                          style={{
                            background: "var(--sl-dark)",
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
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
                      isLinkActive(link.href) ? "vn-active" : "",
                    )}
                    style={{ color: navLinkColor(isLinkActive(link.href)) }}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>

            {session?.user ? userMenu : authLink}

            <button
              onClick={() => setIsOpen(true)}
              aria-label="Open cart"
              type="button"
              className="relative flex items-center transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              <ShoppingBag className="h-[25px] w-[25px]" strokeWidth={1.4} />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[11.25px] font-semibold"
                  style={{
                    background: "var(--sl-coral)",
                    color: "#fff",
                    minWidth: "20px",
                  }}
                >
                  {itemCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </header>

      <NoiseCartDrawer shippingConfig={shippingConfigFromBusiness(business)} />
    </>
  );
}
