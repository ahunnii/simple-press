"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { Menu, ShoppingBag, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../types";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

export function ModernHeader({ business }: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const { data: session, isPending } = authClient.useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        ...(session?.user?.role === "ADMIN" || session?.user?.role === "OWNER"
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
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 border-border sticky top-0 z-50 border-b backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link
          href="/"
          className="text-foreground text-xl font-semibold tracking-tight"
        >
          {business.siteContent?.logoUrl ? (
            <Image
              src={business.siteContent.logoUrl}
              alt={business.name}
              width={50}
              height={50}
              className="bg-primary rounded-full"
            />
          ) : (
            <span className="text-xl font-bold text-gray-900">
              {business.name}
            </span>
          )}
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map(({ href, label }) => {
            return (
              <Link
                key={href + label}
                href={href}
                className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            className="text-foreground hover:text-muted-foreground relative flex items-center transition-colors"
            aria-label={`Shopping cart with ${itemCount} items`}
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="bg-accent text-accent-foreground absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                {itemCount}
              </span>
            )}
          </Link>

          {isPending ? (
            <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
          ) : session?.user ? (
            userMenu
          ) : (
            authActions
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile navigation */}
      <div
        className={cn(
          "border-border overflow-hidden border-t transition-all duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "max-h-48" : "max-h-0 border-t-0",
        )}
      >
        <div className="flex flex-col gap-4 px-6 py-4">
          {links.map(({ href, label }) => {
            return (
              <Link
                key={href + label}
                href={href}
                className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
