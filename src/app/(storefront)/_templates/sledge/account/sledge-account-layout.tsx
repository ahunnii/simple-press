"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookUser, Lock, Package, Settings } from "lucide-react";

import { cn } from "~/lib/utils";

const NAV_ITEMS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/security", label: "Security", icon: Lock },
  { href: "/account/address-book", label: "Address Book", icon: BookUser },
  { href: "/account/preferences", label: "Preferences", icon: Bell },
] as const;

type Props = {
  children: ReactNode;
  heading: string;
};

export function SledgeAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

  return (
    <>
      <section className="border-b bg-white px-7 pt-14 pb-8 md:pb-10" style={{ borderColor: "#e8e8e8" }}>
        <div className="mx-auto max-w-7xl">
          <p
            className="mb-3 font-sans text-xs tracking-[0.18em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            My Account
          </p>
          <h1
            className="font-heading uppercase"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              color: "var(--sl-orange)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            {heading}
          </h1>
        </div>

        <nav
          className="mx-auto mt-6 flex max-w-7xl gap-2 overflow-x-auto pb-1 md:hidden"
          aria-label="Account navigation"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-sm px-3 py-2 font-sans text-[10px] tracking-[0.16em] uppercase transition-all",
                  active ? "text-white" : "",
                )}
                style={
                  active
                    ? { background: "var(--sl-coral)" }
                    : {
                        border: "1px solid #d8d8d8",
                        color: "var(--sl-ink)",
                        background: "#ffffff",
                      }
                }
              >
                <Icon className="h-3 w-3" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </section>

      <section className="bg-white px-7 py-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
          <nav className="hidden md:block" aria-label="Account navigation">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-sm py-2.5 pr-4 pl-3 font-sans text-xs tracking-[0.16em] uppercase transition-colors",
                      )}
                      style={
                        active
                          ? {
                              background: "var(--sl-cream)",
                              color: "var(--sl-coral)",
                              borderLeft: "3px solid var(--sl-coral)",
                            }
                          : {
                              color: "var(--sl-ink-soft)",
                              borderLeft: "3px solid transparent",
                            }
                      }
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="sl-account-content min-w-0">{children}</div>
        </div>
      </section>
    </>
  );
}
