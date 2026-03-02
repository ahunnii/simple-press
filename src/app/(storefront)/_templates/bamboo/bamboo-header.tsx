"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { Menu, ShoppingBag } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../types";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

import { MobileNav } from "./bamboo-mobile-nav";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

export function BambooHeader({ business }: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
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
        ...(session?.user?.platformRole === "PLATFORM_ADMIN"
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
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          {business.siteContent?.logoUrl ? (
            <div className="relative aspect-square h-20 w-full rounded-sm">
              <Image
                src={business.siteContent.logoUrl}
                alt={business.name}
                sizes="(max-width: 768px) 100vw, 55px"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <span className="text-primary font-heading text-xl font-bold tracking-tight">
              {business.name ?? "Business"}
            </span>
          )}
        </Link>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-primary text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isPending ? (
            <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
          ) : session?.user ? (
            userMenu
          ) : (
            authActions
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link
              href="/cart"
              aria-label={`Shopping cart with ${itemCount} items`}
            >
              <span className="relative">
                <ShoppingBag className="size-5" />
                {itemCount > 0 && (
                  <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
                    {itemCount}
                  </span>
                )}
              </span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <MobileNav
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        business={business}
      />
    </header>
  );
}
