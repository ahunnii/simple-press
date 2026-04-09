"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import {
  LayoutDashboardIcon,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../types";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

import { ElegantCartDrawer } from "./elegant-cart-drawer";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function ElegantHeader({ business }: DefaultHeaderTemplateProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setIsOpen, itemCount } = useCart();

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const pathname = usePathname();

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
      <Button size="sm" asChild>
        <Link href="/join">Join Us</Link>
      </Button>
    </>
  );

  const userMenu = user && (
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
        ...(user.platformRole === "PLATFORM_ADMIN"
          ? [
              {
                icon: <LayoutDashboardIcon className="h-4 w-4" />,
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
      <header className="fixed top-0 right-0 left-0 z-50 px-4 pt-4">
        <nav
          className="animate-scale-fade-in mx-auto my-0 max-w-7xl rounded-lg border border-[rgba(255,255,255,0.32)] bg-[rgba(255,255,255,0.4)] px-6 py-0 backdrop-blur-md lg:px-8"
          style={{ boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 50px" }}
        >
          <div className="flex h-[68px] items-center justify-between">
            {/* Mobile menu button */}
            <button
              type="button"
              className="text-foreground/80 hover:text-foreground boty-transition p-2 lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Desktop Navigation - Left */}
            <div className="hidden items-center gap-8 lg:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide",
                    pathname === link.href
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Logo */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  width={40}
                  height={40}
                  className="bg-primary rounded-full"
                />
              ) : (
                <h1 className="text-foreground font-serif text-3xl tracking-wider">
                  {business?.name}
                </h1>
              )}
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="text-foreground/70 hover:text-foreground boty-transition p-2"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              {isPending ? (
                <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
              ) : user ? (
                userMenu
              ) : (
                authActions
              )}
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="text-foreground/70 hover:text-foreground boty-transition relative p-2"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="bg-primary text-primary-foreground absolute -top-0 -right-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <ElegantCartDrawer />

          {/* Mobile Navigation */}
          <div
            className={`boty-transition overflow-hidden lg:hidden ${
              isMenuOpen ? "max-h-64 pb-6" : "max-h-0"
            }`}
          >
            <div className="border-border/50 flex flex-col gap-4 border-t pt-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide",
                    pathname === link.href
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
