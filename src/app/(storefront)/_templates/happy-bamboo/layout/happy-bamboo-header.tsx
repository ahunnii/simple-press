"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Heart, Leaf, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { resolveFields } from "..";
import { HappyBambooCartDrawer } from "../cart-checkout/happy-bamboo-cart-drawer";
import {
  HappyBambooMenuToggle,
  HappyBambooMobileMenu,
  NAV_LINKS,
} from "./happy-bamboo-mobile-nav";

export function HappyBambooHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } = useWishlist();
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const { data: session, isPending } = useHydratedSession(initialSession);

  const [mobileOpen, setMobileOpen] = useState(false);
  // The mobile panel hangs off the header's bottom edge and hands focus back
  // to the toggle on Escape.
  const headerRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

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

  const f = resolveFields(business.siteContent?.customFields, [
    "happy-bamboo.global.cart-label",
    "happy-bamboo.global.cart-empty-text",
  ]);
  const cartLabel = f["happy-bamboo.global.cart-label"] ?? "";
  const cartEmptyText = f["happy-bamboo.global.cart-empty-text"] ?? "";

  // Desktop only — below md, "Log in" lives in the mobile panel so the bar
  // stays logo · wishlist · cart · menu.
  const authActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-background hover:bg-background/10 hidden hover:text-[var(--hb-gold)] md:inline-flex"
      >
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
    </>
  );

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="border-primary border"
      avatarClassName="size-10"
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
      <header
        ref={headerRef}
        className="border-border/40 sticky top-0 z-50 w-full border-b bg-[var(--hb-brand)] backdrop-blur supports-backdrop-filter:bg-[var(--hb-brand)]"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2"
          >
            {business.siteContent?.logoUrl ? (
              <div className="relative aspect-video h-16 w-full rounded-sm">
                <Image
                  src={business.siteContent.logoUrl}
                  alt={resolveLogoAlt(
                    business.siteContent?.logoAltText,
                    business.name,
                  )}
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
                  "text-background text-sm font-medium transition-colors hover:text-[var(--hb-gold)]",
                  pathname === link.href
                    ? "text-[var(--hb-gold)]"
                    : "text-background",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            {isEnabled("customerAccounts") && (
              <>
                {isPending ? (
                  <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                ) : session?.user ? (
                  userMenu
                ) : (
                  authActions
                )}
              </>
            )}
            {isEnabled("wishlist") && (
              <Button
                variant="ghost"
                size="icon"
                className="text-background hover:bg-background/10 relative hover:text-[var(--hb-gold)]"
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
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-background hover:bg-background/10 relative hover:text-[var(--hb-gold)]"
              onClick={() => {
                setMobileOpen(false);
                setIsOpen(true);
              }}
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

            <HappyBambooMenuToggle
              ref={menuToggleRef}
              open={mobileOpen}
              onOpenChange={setMobileOpen}
            />
          </div>
        </div>

        {/* Mobile drop-down panel — inside <header> so it inherits the
            .happy-bamboo tokens/fonts and the header's sticky positioning. */}
        <HappyBambooMobileMenu
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          business={business}
          session={session}
          isPending={isPending}
          isEnabled={isEnabled}
          headerRef={headerRef}
          toggleRef={menuToggleRef}
        />
      </header>
      <HappyBambooCartDrawer
        shippingConfig={shippingConfigFromBusiness(business)}
        cartLabel={cartLabel}
        cartEmptyText={cartEmptyText}
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
