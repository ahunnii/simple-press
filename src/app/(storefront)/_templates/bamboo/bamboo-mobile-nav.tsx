"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DefaultHeaderTemplateProps } from "../types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & DefaultHeaderTemplateProps;

export function MobileNav({ open, onOpenChange, business }: MobileNavProps) {
  const pathname = usePathname();

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? NAV_LINKS;

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
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onOpenChange(false)}
              className={`hover:bg-secondary rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
