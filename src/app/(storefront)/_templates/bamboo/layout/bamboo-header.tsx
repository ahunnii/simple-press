"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Menu, ShoppingBag } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

import { BambooMobileNav } from "./bamboo-mobile-nav";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function BambooHeader({ business }: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Close desktop dropdown on Escape, returning focus to trigger
  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const trigger = triggerRefs.current.get(openDropdown);
        setOpenDropdown(null);
        trigger?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  const links =
    (business?.siteContent?.navigationItems as NavLink[]) ?? NAV_LINKS;

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
          {links.map((link, i) =>
            link.children?.length ? (
              <div
                key={link.href + link.label}
                className="relative"
                onMouseEnter={() => setOpenDropdown(i)}
                onMouseLeave={() => setOpenDropdown(null)}
                onBlur={(e) => {
                  // Close when focus leaves the wrapper entirely
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setOpenDropdown(null);
                  }
                }}
              >
                <button
                  type="button"
                  ref={(el) => {
                    if (el) triggerRefs.current.set(i, el);
                    else triggerRefs.current.delete(i);
                  }}
                  aria-haspopup="true"
                  aria-expanded={openDropdown === i ? "true" : "false"}
                  aria-controls={`bamboo-nav-dropdown-${i}`}
                  onClick={() => setOpenDropdown(openDropdown === i ? null : i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-sm font-medium transition-colors",
                    link.children.some((c) => pathname === c.href)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {link.label}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      openDropdown === i ? "rotate-180" : "",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {openDropdown === i && (
                  <div
                    id={`bamboo-nav-dropdown-${i}`}
                    className="absolute top-full left-0 z-10 pt-2"
                  >
                    <div className="bg-background border-border/60 min-w-[160px] overflow-hidden rounded-(--radius) border shadow-sm">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          target={child.external ? "_blank" : undefined}
                          rel={
                            child.external ? "noopener noreferrer" : undefined
                          }
                          aria-current={
                            pathname === child.href ? "page" : undefined
                          }
                          onClick={() => setOpenDropdown(null)}
                          className={cn(
                            "block px-4 py-2.5 text-sm transition-colors",
                            pathname === child.href
                              ? "text-primary bg-secondary"
                              : "text-muted-foreground hover:text-primary hover:bg-secondary",
                          )}
                        >
                          {child.label}
                          {child.external && (
                            <span className="sr-only"> (opens in new tab)</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                aria-current={pathname === link.href ? "page" : undefined}
                className={`hover:text-primary text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
                {link.external && (
                  <span className="sr-only"> (opens in new tab)</span>
                )}
              </Link>
            ),
          )}
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
              <span className="relative" aria-hidden="true">
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
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <BambooMobileNav
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        business={business}
      />
    </header>
  );
}
