"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { Menu, ShoppingBag, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../types";
import { formatPrice } from "~/lib/prices";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

function LogoTwoLine({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const line1 = parts[0] ?? name;
  const line2 = parts.slice(1).join(" ") || (parts[0] ?? "");

  return (
    <span className="flex flex-col leading-tight">
      <span className="font-bold tracking-[0.2em] text-white uppercase">
        {line1}
      </span>
      <span className="ml-3 font-bold tracking-[0.2em] text-white uppercase">
        {line2}
      </span>
    </span>
  );
}

export function DarkTrendHeader({ business }: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const { itemCount, total } = useCart();
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
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#1F1F1F]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-4 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-widest text-white md:text-xl"
          aria-label={`${business.name} home`}
        >
          {business.siteContent?.logoUrl ? (
            <div className="relative aspect-video h-20 w-full rounded-sm">
              <Image
                src={business.siteContent.logoUrl}
                alt={business.name}
                sizes="(max-width: 768px) 100vw, 55px"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <LogoTwoLine name={business.name} />
          )}
        </Link>

        {/* Center nav - hidden on small screens */}
        <div className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-8">
            {links.map(({ href, label }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href + label}>
                  <Link
                    href={href}
                    className={`relative py-1 text-sm font-semibold transition-colors ${
                      isActive ? "text-white" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <span
                        className="absolute -right-1 -bottom-0.5 -left-1 border-b-2 border-[#6A5ACD]"
                        aria-hidden
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: search + cart total + cart icon */}
        <div className="flex shrink-0 items-center gap-6">
          <Link
            href="/cart"
            className="flex items-center gap-2 text-white/90 transition-colors hover:text-white"
            aria-label={`Cart with ${itemCount} items`}
          >
            <span className="text-sm font-medium">{formatPrice(total)}</span>
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="sr-only">({itemCount} items)</span>
            )}
          </Link>
          {isPending ? (
            <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
          ) : session?.user ? (
            userMenu
          ) : (
            authActions
          )}

          <button
            type="button"
            className="text-white/80 md:hidden"
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

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/10 transition-all duration-300 md:hidden ${
          mobileMenuOpen ? "max-h-[320px]" : "max-h-0 border-t-0"
        }`}
      >
        <ul className="flex flex-col gap-1 px-6 py-4">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href + label}>
                <Link
                  href={href}
                  className={`block py-2 text-sm ${
                    isActive ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
