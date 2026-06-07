"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = { label: string; href: string; external?: boolean; children?: NavChild[] };

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & DefaultHeaderTemplateProps;

export function BambooMobileNav({
  open,
  onOpenChange,
  business,
}: MobileNavProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const links =
    (business?.siteContent?.navigationItems as NavLink[]) ?? NAV_LINKS;

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="bg-background w-72">
        <SheetHeader>
          <SheetTitle className="text-primary font-heading text-xl">
            {business.name ?? "Business"}
          </SheetTitle>
        </SheetHeader>
        <nav
          className="flex flex-col gap-1 px-4"
          aria-label="Mobile navigation"
        >
          {links.map((link, i) =>
            link.children?.length ? (
              <div key={link.href + link.label}>
                <button
                  onClick={() => toggleExpanded(i)}
                  aria-expanded={expandedItems.has(i)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    link.children.some((c) => pathname === c.href)
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {link.label}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      expandedItems.has(i) ? "rotate-180" : "",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {expandedItems.has(i) && (
                  <div className="mt-1 flex flex-col gap-0.5 pl-3">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        target={child.external ? "_blank" : undefined}
                        rel={child.external ? "noopener noreferrer" : undefined}
                        onClick={() => onOpenChange(false)}
                        aria-current={pathname === child.href ? "page" : undefined}
                        className={cn(
                          "rounded-md px-3 py-2 text-sm transition-colors",
                          pathname === child.href
                            ? "bg-secondary text-primary font-medium"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        {child.label}
                        {child.external && (
                          <span className="sr-only"> (opens in new tab)</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                onClick={() => onOpenChange(false)}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {link.label}
                {link.external && (
                  <span className="sr-only"> (opens in new tab)</span>
                )}
              </Link>
            ),
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
