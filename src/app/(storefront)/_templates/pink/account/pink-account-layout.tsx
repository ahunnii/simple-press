"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

import { PinkPageHeader } from "../shared/pink-page-header";

const NAV_ITEMS = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/settings", label: "Settings" },
  { href: "/account/security", label: "Security" },
  { href: "/account/address-book", label: "Address Book" },
  { href: "/account/preferences", label: "Preferences" },
] as const;

type PinkAccountLayoutProps = {
  children: ReactNode;
  /** Shown as the breadcrumb's third segment and the content column's H2. */
  title: string;
  /** One short line under the content H2. */
  description?: string;
};

/**
 * Shared account chrome for every account slot (design.md → "Account pages").
 *
 * Carries the ONE `<h1>` for every account page ("Your account" — constant,
 * per the design spec) so individual pages never render their own H1; the
 * per-page `title` becomes the breadcrumb's third segment and an in-content
 * H2 instead, for wayfinding. Sidebar is a sticky label + ruled row list at
 * `min-[900px]:` and above; below that it collapses to a horizontally
 * scrolling hairline chip row. Outermost wrapper carries `pink-account`,
 * which remaps shadcn's CSS variables (`--background`, `--card`, `--primary`,
 * …) onto pink's tokens so the shared better-auth-ui cards and the shared
 * `AddressBookContent` / `PreferencesContent` components read as this
 * template's own UI.
 */
export function PinkAccountLayout({
  children,
  title,
  description,
}: PinkAccountLayoutProps) {
  const pathname = usePathname();
  // No server seed reaches this component, so the unseeded hook is the right
  // shape: `intro` below renders a conditional element off the session, which
  // the raw `authClient.useSession()` could resolve before hydration and
  // mismatch against the server's markup.
  const { data: session } = useHydratedSession();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="pink-account">
      <PinkPageHeader
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/orders" },
          { label: title },
        ]}
        heading="Your account"
        intro={session?.user?.email ?? undefined}
      />

      <div
        className="px-5 py-14 md:px-10 md:py-16"
        style={{ background: "var(--pink-paper)" }}
      >
        <div className="mx-auto max-w-[1400px]">
          {/* Mobile / tablet nav — horizontally scrolling hairline chip row */}
          <nav
            aria-label="Account navigation"
            className="mb-9 min-[900px]:hidden"
          >
            <div
              className="flex gap-[1px] overflow-x-auto"
              style={{
                background: "var(--pink-line)",
                border: "1px solid var(--pink-line)",
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors"
                    style={{
                      background: active
                        ? "var(--pink-ink)"
                        : "var(--pink-paper)",
                      color: active ? "var(--pink-paper)" : "var(--pink-muted)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="grid gap-11 min-[900px]:grid-cols-[232px_1fr]">
            {/* Desktop sidebar */}
            <aside className="hidden min-[900px]:block">
              <div
                className="sticky flex flex-col gap-5"
                style={{ top: "var(--pink-sticky-top)" }}
              >
                <p className="pink-label">Account</p>
                <nav aria-label="Account navigation">
                  <ul className="flex flex-col">
                    {NAV_ITEMS.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <li
                          key={item.href}
                          style={{ borderBottom: "1px solid var(--pink-line)" }}
                        >
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className="block py-3 text-[15px] transition-colors"
                            style={{
                              color: active
                                ? "var(--pink-rose)"
                                : "var(--pink-ink)",
                              fontWeight: active ? 600 : 400,
                            }}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="min-w-0">
              <div className="mb-8 flex flex-col gap-2">
                <h2
                  className="pink-display"
                  style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {title}
                </h2>
                {description && (
                  <p
                    className="max-w-[52ch] text-[15px] leading-[1.7]"
                    style={{ color: "var(--pink-muted)" }}
                  >
                    {description}
                  </p>
                )}
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
