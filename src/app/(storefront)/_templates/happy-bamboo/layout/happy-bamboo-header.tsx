"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Heart, Leaf, Menu, ShoppingCart } from "lucide-react";
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
import { useWishlist } from "~/providers/wishlist-context";

import { HappyBambooCartDrawer } from "../cart-checkout/happy-bamboo-cart-drawer";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

export function HappyBambooHeader({
  business,
  session,
}: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } =
    useWishlist();
  const pathname = usePathname();
  // const { data: session, isPending } = authClient.useSession();

  const [mobileOpen, setMobileOpen] = useState(false);

  // Announce cart changes to screen readers. Skip the initial hydration value
  // so we don't announce on every page load.
  const [cartAnnouncement, setCartAnnouncement] = useState("");
  const prevItemCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevItemCount.current === null) {
      prevItemCount.current = itemCount;
      return;
    }
    if (itemCount !== prevItemCount.current) {
      setCartAnnouncement(
        itemCount === 0
          ? "Cart is now empty."
          : `Cart updated. ${itemCount} ${itemCount === 1 ? "item" : "items"} in cart.`,
      );
      prevItemCount.current = itemCount;
    }
  }, [itemCount]);

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? NAV_LINKS;

  const authActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-background hover:bg-background/10 hover:text-[#E3CF99]"
      >
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
        {
          icon: <IconPackage className="h-4 w-4" />,
          label: "Orders",
          href: "/account/orders",
        },
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
            {session?.user ? userMenu : authActions}
            <Button
              variant="ghost"
              size="icon"
              className="text-background hover:bg-background/10 relative hover:text-[#E3CF99]"
              asChild
            >
              <Link href="/wishlist" aria-label="Open wishlist">
                <Heart className="h-5 w-5" />
                {wishlistHydrated && wishlistCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-background hover:bg-background/10 relative hover:text-[#E3CF99]"
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-background hover:bg-background/10 hover:text-[#E3CF99]"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className={cn(
                  "flex w-[min(100vw-1rem,20rem)] flex-col gap-0 border-l border-[#608418]/20 p-0",
                  "[&>button]:text-background [&>button]:opacity-90 [&>button]:hover:bg-white/15 [&>button]:hover:opacity-100",
                )}
              >
                <div className="bg-[#608418] pt-12 pr-14 pb-5 pl-4">
                  <SheetTitle className="text-background flex items-center gap-2.5 text-left text-lg font-semibold tracking-tight">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3CF99]/20">
                      <Leaf className="h-5 w-5 text-[#E3CF99]" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xs font-medium tracking-widest text-[#E3CF99]/90 uppercase">
                        Explore
                      </span>
                      <span className="truncate">
                        {business.name ?? "Menu"}
                      </span>
                    </span>
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Primary site navigation for {business.name ?? "this store"}.
                    Choose a page to continue.
                  </SheetDescription>
                </div>

                <nav
                  className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain bg-[#FFFCF6] p-3"
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
                          "flex min-h-12 items-center rounded-lg border-l-4 py-3 pr-4 pl-3 text-base font-medium transition-colors",
                          active
                            ? "border-[#608418] bg-[#E3CF99]/40 text-[#3d560d] shadow-sm"
                            : "text-foreground/85 border-transparent hover:bg-[#608418]/8 hover:text-[#608418] active:bg-[#608418]/12",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-[#608418]/12 bg-[#F5F0E4] px-4 py-3 text-center text-xs leading-relaxed text-[#5a6b3a]">
                  Tree-free products · Crafted with care
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <HappyBambooCartDrawer
        shippingConfig={shippingConfigFromBusiness(business)}
      />
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {cartAnnouncement}
      </span>
    </>
  );
}
