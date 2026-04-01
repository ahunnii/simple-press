"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { Leaf, Menu, ShoppingBag, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../types";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { useCart } from "~/providers/cart-context";

import { shippingConfigFromBusiness } from "~/lib/shipping-utils";

import { MobileNav } from "./bamboo-mobile-nav";
import { FadeIn } from "./happy-bamboo-animations";
import { HappyBambooCartDrawer } from "./happy-bamboo-cart-drawer";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

export function HappyBambooHeader({ business }: DefaultHeaderTemplateProps) {
  const { itemCount, isOpen, setIsOpen } = useCart();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  const [mobileOpen, setMobileOpen] = useState(false);

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? NAV_LINKS;

  const authActions = (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
    </>
  );

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "border-primary border",
          avatar: {
            base: "size-10",
          },
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
    // <FadeIn direction="down" duration={0.5}>
    <>
      <header className="border-border/40 sticky top-0 z-50 w-full border-b bg-[#608418] backdrop-blur supports-backdrop-filter:bg-[#608418]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            {business.siteContent?.logoUrl ? (
              <div className="relative aspect-video h-16 w-full rounded-sm">
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  sizes="(max-width: 768px) 100vw, 55px"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <Leaf className="text-primary h-8 w-8" />
                <span className="text-foreground text-xl font-bold">
                  {business.name ?? "Business"}
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-background text-sm font-medium transition-colors hover:text-[#E3CF99]",
                  pathname === link.href ? "text-[#E3CF99]" : "text-background",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {isPending ? (
              <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
            ) : session?.user ? (
              userMenu
            ) : (
              authActions
            )}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setIsOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                >
                  {itemCount}
                </motion.span>
              )}
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Leaf className="text-primary h-6 w-6" />
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-4">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-foreground hover:text-primary text-lg font-medium transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <HappyBambooCartDrawer
        shippingConfig={shippingConfigFromBusiness(business)}
      />
    </>
  );
}
