"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

import { resolveFields } from "../index";
import { NoiseCartDrawer } from "../cart-checkout/noise-cart-drawer";

// Links shown on the LEFT side of the header (shop/collections)
const LEFT_NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
] as const;

// Links always shown on the RIGHT side (editorial/info pages)
const RIGHT_NAV = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Journal" },
  { href: "/testimonials", label: "Reviews" },
  { href: "/contact", label: "Contact" },
] as const;

export function NoiseHeader({ business, session }: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const businessName = business?.name ?? "";
  const customFields = business?.siteContent?.customFields as Record<string, string> | undefined;
  const g = resolveFields(customFields, [
    "noise.global.location-tag",
    "noise.global.footer-tagline",
  ]);
  const locationTag = g["noise.global.location-tag"] ?? "";
  const footerTagline = g["noise.global.footer-tagline"] ?? "";

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "rounded-full w-auto h-auto p-0 border border-foreground/30",
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
        className="h-[18px] w-[18px] transition-opacity hover:opacity-60"
        style={{ color: "var(--vn-ink-soft)" }}
        strokeWidth={1.4}
      />
    </Link>
  );

  const allNavLinks = [...LEFT_NAV, ...RIGHT_NAV];

  return (
    <>
      <header
        className="bg-background sticky top-0 z-50 w-full"
        style={{
          // background: "var(--vn-bone)",
          borderBottom: "1px solid var(--vn-line-soft) ",
        }}
      >
        <div
          className="grid items-center px-5 sm:px-9"
          style={{
            gridTemplateColumns: "1fr auto 1fr",
            padding: "18px 36px",
            gap: "24px",
          }}
        >
          {/* ── Left: search + shop/collection links ── */}
          <div className="flex items-center gap-6">
            {/* Left nav links (desktop only) */}
            <nav className="hidden items-center gap-6 md:flex">
              {LEFT_NAV.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "vn-nav-link font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
                      active
                        ? "text-foreground vn-active"
                        : "hover:text-foreground",
                    )}
                    style={{
                      color: active ? "var(--vn-ink)" : "var(--vn-ink-soft)",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Center: wordmark ── */}
          <Link href="/" className="vn-wordmark" aria-label="Home">
            {business.siteContent?.logoUrl ? (
              <div className="relative h-14 w-28">
                <Image
                  src={business.siteContent.logoUrl}
                  alt={businessName}
                  fill
                  sizes="112px"
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <span>{businessName.toUpperCase()}</span>
                {locationTag && <span className="vn-wordmark-sub">{locationTag}</span>}
              </>
            )}
          </Link>

          {/* ── Right: editorial links + account + bag ── */}
          <div className="flex items-center justify-end gap-6">
            {/* Right nav links (desktop only) */}
            <nav className="hidden items-center gap-6 md:flex">
              {RIGHT_NAV.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "vn-nav-link font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
                      active
                        ? "text-foreground vn-active"
                        : "hover:text-foreground",
                    )}
                    style={{
                      color: active ? "var(--vn-ink)" : "var(--vn-ink-soft)",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Account */}
            {session?.user ? userMenu : authLink}

            {/* Bag */}
            <button
              onClick={() => setIsOpen(true)}
              aria-label="Open cart"
              className="relative flex items-center transition-opacity hover:opacity-60"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
                  style={{
                    background: "var(--vn-accent)",
                    color: "#fff",
                    minWidth: "16px",
                  }}
                >
                  {itemCount}
                </motion.span>
              )}
            </button>

            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  style={{
                    border: "1px solid var(--vn-rule)",
                    color: "var(--vn-ink-soft)",
                  }}
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[min(100vw-1rem,22rem)] flex-col gap-0 rounded-none p-0"
                style={{
                  // background: "var(--vn-bone)",
                  borderLeft: "1px solid var(--vn-rule)",
                }}
              >
                <div
                  className="border-b px-6 pt-12 pb-6"
                  style={{ borderColor: "var(--vn-rule)" }}
                >
                  <SheetTitle
                    className="vn-wordmark"
                    style={{ alignItems: "flex-start" }}
                  >
                    <span>{businessName.toUpperCase()}</span>
                    {locationTag && <span className="vn-wordmark-sub">{locationTag}</span>}
                  </SheetTitle>
                  {footerTagline && (
                    <SheetDescription
                      className="mt-2 font-mono text-[9px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      {footerTagline}
                    </SheetDescription>
                  )}
                </div>

                <nav
                  className="flex flex-1 flex-col gap-0 overflow-y-auto overscroll-contain p-4"
                  aria-label="Mobile navigation"
                >
                  {allNavLinks.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center border-b py-4 font-mono text-[10px] tracking-[0.3em] uppercase transition-colors"
                        style={{
                          borderColor: "var(--vn-line-soft)",
                          color: active
                            ? "var(--vn-ink)"
                            : "var(--vn-steel-mist)",
                        }}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>

                <div
                  className="flex items-center justify-between border-t px-6 py-4"
                  style={{ borderColor: "var(--vn-rule)" }}
                >
                  {session?.user ? (
                    <div className="flex items-center gap-3">
                      {userMenu}
                      <span
                        className="font-mono text-[9px] tracking-[0.3em] uppercase"
                        style={{ color: "var(--vn-steel-mist)" }}
                      >
                        Account
                      </span>
                    </div>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      onClick={() => setMobileOpen(false)}
                      className="font-mono text-[10px] tracking-[0.22em] uppercase transition-colors hover:opacity-80"
                      style={{ color: "var(--vn-steel-mist)" }}
                    >
                      Login →
                    </Link>
                  )}
                  <span
                    className="font-mono text-[9px] tracking-[0.3em] uppercase"
                    style={{ color: "var(--vn-steel-mist)" }}
                  >
                    {new Date().getFullYear()}
                  </span>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <NoiseCartDrawer shippingConfig={shippingConfigFromBusiness(business)} />
    </>
  );
}
