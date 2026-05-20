"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { Menu, ShoppingBag } from "lucide-react";
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

import { NoiseCartDrawer } from "../cart-checkout/noise-cart-drawer";

const NAV_LINKS = [
  { href: "/", label: "Index" },
  { href: "/shop", label: "Shop" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "Studio" },
  { href: "/contact", label: "Contact" },
] as const;

export function NoiseHeader({ business, session }: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? NAV_LINKS;

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "border border-foreground/30 rounded-none",
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
    <Link
      href="/auth/sign-in"
      className="text-foreground/50 hover:text-foreground font-mono text-[10px] tracking-[0.18em] uppercase transition-colors"
    >
      Login
    </Link>
  );

  return (
    <>
      <header className="bg-background sticky top-0 z-50 w-full">
        {/* Row 1 — Topbar: steel bg with coordinates and seasonal info */}
        <div className="vn-topbar hidden sm:flex">
          <div className="flex items-center gap-5">
            <span>
              <span className="vn-dot" />
              Made in Detroit
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden opacity-70 md:inline">
              Free shipping over $200
            </span>
            {authLink}
          </div>
        </div>

        {/* Row 2 — Site head: three-column with centered wordmark */}
        <div className="border-foreground bg-background grid grid-cols-[1fr_auto_1fr] items-center border-b px-4 py-3 sm:px-7 sm:py-4">
          {/* Left: stamps */}
          <div className="flex items-center gap-3">
            <nav
              className="border-foreground/20 bg-background hidden items-center justify-between px-7 py-3 md:flex"
              aria-label="Main navigation"
            >
              <div className="flex items-center gap-7">
                {links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "vn-nav-link font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
                        active
                          ? "text-foreground vn-active"
                          : "text-foreground/45 hover:text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Center: wordmark */}
          <Link href="/" className="vn-wordmark">
            {business.siteContent?.logoUrl ? (
              <div className="relative h-16 w-32">
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  fill
                  sizes="160px"
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <span>Visual</span>
                <span className="vn-wordmark-x">×</span>
                <span>Noise</span>
                <span className="vn-wordmark-detroit">DETROIT</span>
              </>
            )}
          </Link>

          {/* Right: actions */}
          <div className="flex items-center justify-end gap-3">
            {/* <span className="vn-stamp vn-stamp-solid hidden md:inline-flex">
              EST · 2014
            </span> */}
            {session?.user ? userMenu : null}
            <button
              onClick={() => setIsOpen(true)}
              aria-label="Open cart"
              className="vn-stamp hover:bg-foreground hover:text-background relative cursor-pointer transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>BAG</span>
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="font-mono text-[10px]"
                >
                  · {itemCount}
                </motion.span>
              )}
            </button>
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="border-foreground/20 text-foreground/60 hover:bg-foreground hover:text-background h-8 w-8 rounded-none border"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="border-foreground bg-background flex w-[min(100vw-1rem,22rem)] flex-col gap-0 rounded-none border-l p-0"
              >
                <div className="border-foreground border-b px-6 pt-12 pb-6">
                  <SheetTitle className="vn-wordmark">
                    <span>Visual</span>
                    <span className="vn-wordmark-x">×</span>
                    <span>Noise</span>
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground mt-2 font-mono text-[9px] tracking-[0.3em] uppercase">
                    Detroit Fashion
                  </SheetDescription>
                </div>
                <nav
                  className="flex flex-1 flex-col gap-0 overflow-y-auto overscroll-contain p-4"
                  aria-label="Mobile navigation"
                >
                  {links.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "border-border flex items-center border-b py-4 font-mono text-[10px] tracking-[0.3em] uppercase transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
                {/* Auth action in mobile sheet */}
                <div className="border-border flex items-center justify-between border-t px-6 py-4">
                  {session?.user ? (
                    <div className="flex items-center gap-3">
                      {userMenu}
                      <span className="text-muted-foreground/50 font-mono text-[9px] tracking-[0.3em] uppercase">
                        Account
                      </span>
                    </div>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      onClick={() => setMobileOpen(false)}
                      className="hover:text-foreground text-muted-foreground font-mono text-[10px] tracking-[0.22em] uppercase transition-colors"
                    >
                      Login →
                    </Link>
                  )}
                  <span className="text-muted-foreground/50 font-mono text-[9px] tracking-[0.3em] uppercase">
                    Det. 2014
                  </span>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Row 3 — Nav row */}
        {/* <nav
          className="border-foreground/20 bg-background hidden items-center justify-between border-b px-7 py-3 md:flex"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-7">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "vn-nav-link font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
                    active
                      ? "text-foreground vn-active"
                      : "text-foreground/45 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="text-foreground/40 flex items-center gap-4 font-mono text-[10.5px] tracking-[0.18em] uppercase">
            <span className="hidden lg:inline">Made in Detroit</span>
          </div>
        </nav> */}
      </header>
      <NoiseCartDrawer shippingConfig={shippingConfigFromBusiness(business)} />
    </>
  );
}
