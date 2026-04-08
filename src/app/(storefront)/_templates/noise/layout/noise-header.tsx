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
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
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

  const authActions = (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className="font-sans text-[10px] tracking-[0.2em] uppercase text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
    >
      <Link href="/auth/sign-in">Log in</Link>
    </Button>
  );

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "border border-border",
          avatar: { base: "size-8" },
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

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {business.siteContent?.logoUrl ? (
              <div className="relative h-14 w-44">
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  fill
                  sizes="176px"
                  className="object-contain object-left"
                />
              </div>
            ) : (
              <span className="font-serif text-xl font-light tracking-[0.12em] text-foreground">
                {business.name ?? "Visual Noise"}
              </span>
            )}
          </Link>

          {/* Desktop Nav — centered */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-sans text-[10px] tracking-[0.22em] uppercase transition-colors",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-foreground/45 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {session?.user ? userMenu : authActions}

            <Button
              variant="ghost"
              size="icon"
              className="relative text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              onClick={() => setIsOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background"
                >
                  {itemCount}
                </motion.span>
              )}
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[min(100vw-1rem,20rem)] flex-col gap-0 border-l border-border bg-background p-0"
              >
                <div className="border-b border-border px-6 pb-6 pt-12">
                  <SheetTitle className="font-serif text-xl font-light tracking-widest text-foreground">
                    {business.name ?? "Visual Noise"}
                  </SheetTitle>
                  <SheetDescription className="mt-1 font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
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
                          "flex items-center border-b border-border py-4 font-sans text-[10px] tracking-[0.3em] uppercase transition-colors",
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

                <div className="border-t border-border px-6 py-4 font-sans text-[9px] tracking-[0.3em] uppercase text-muted-foreground/50">
                  Visual Noise · Detroit
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
