"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import {
  LayoutDashboardIcon,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { authClient } from "~/server/better-auth/client";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useCart } from "~/providers/cart-context";

import { ElegantCartDrawer } from "../cart-checkout/elegant-cart-drawer";

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ElegantHeader({ business }: DefaultHeaderTemplateProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { setIsOpen, itemCount } = useCart();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const pathname = usePathname();
  const router = useRouter();

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape and return focus to hamburger button
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  function openSearch() {
    setSearchOpen(true);
    setSearchValue("");
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchValue("");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    closeSearch();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  const DEFAULT_NAV_LINKS = [
    { href: "/shop", label: "Shop" },
    ...(isEnabled("collections")
      ? [{ href: "/collections", label: "Collections" }]
      : []),
    { href: "/blog", label: "Journal" },
    { href: "/about", label: "About" },
  ];

  const links =
    (business?.siteContent?.navigationItems as
      | { label: string; href: string }[]
      | undefined) ?? DEFAULT_NAV_LINKS;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const iconBtnStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--el-ink, #1c1a17)",
    flexShrink: 0,
  };

  return (
    <>
      {/* Fixed shell — full-width floating pill */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          right: 16,
          zIndex: 100,
          pointerEvents: "none",
        }}
      >
        {/* ── Pill nav ──
            Exactly 3 grid children: [left-col] [logo] [right-col]
            Left col contains both the desktop nav list and the mobile
            hamburger — only one is visible at a time via CSS, but they
            share the same grid cell so the logo always stays centred. */}
        <nav
          aria-label="Main navigation"
          className="el-pill"
          style={{
            pointerEvents: "auto",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            padding: "12px 24px",
            background: scrolled
              ? "rgba(251, 248, 242, 0.95)"
              : "rgba(251, 248, 242, 0.80)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            border: "1px solid rgba(28, 26, 23, 0.08)",
            borderRadius: 999,
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.5) inset, 0 20px 40px -24px rgba(28,26,23,0.18)",
            transition: `background 0.5s ${ease}`,
          }}
        >
          {/* ── Column 1: nav links (desktop) OR hamburger (mobile) ── */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Desktop nav links */}
            <div
              className="el-desktop-nav"
              style={{ display: "flex", alignItems: "center", gap: 24 }}
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="el-nav-link"
                  aria-current={isActive(link.href) ? "page" : undefined}
                  style={{
                    position: "relative",
                    fontSize: 13.5,
                    letterSpacing: "0.04em",
                    color: isActive(link.href)
                      ? "var(--el-ink, #1c1a17)"
                      : "var(--el-ink-soft, #6b6659)",
                    padding: "6px 2px",
                    textDecoration: "none",
                    fontFamily: "var(--font-sans, Manrope, sans-serif)",
                    whiteSpace: "nowrap",
                  }}
                  data-active={isActive(link.href) ? "true" : undefined}
                >
                  {link.label}
                  <span
                    className="el-nav-underline"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 1,
                      background: "var(--el-ink, #1c1a17)",
                      display: "block",
                      transform: isActive(link.href)
                        ? "scaleX(1)"
                        : "scaleX(0)",
                      transformOrigin: "left",
                      transition: `transform 0.4s ${ease}`,
                    }}
                  />
                </Link>
              ))}
            </div>

            {/* Mobile hamburger (hidden on desktop) */}
            <button
              ref={hamburgerRef}
              type="button"
              className="el-hamburger"
              style={{ ...iconBtnStyle, display: "none" }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="el-mobile-nav"
            >
              {menuOpen ? (
                <X aria-hidden={true} style={{ width: 18, height: 18 }} />
              ) : (
                <Menu aria-hidden={true} style={{ width: 18, height: 18 }} />
              )}
            </button>
          </div>

          {/* ── Column 2 (center): wordmark / logo ── */}
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontSize: 26,
              fontStyle: "italic",
              fontWeight: 500,
              letterSpacing: "0.01em",
              lineHeight: 1,
              textAlign: "center",
              color: "var(--el-ink, #1c1a17)",
              textDecoration: "none",
              display: "block",
              whiteSpace: "nowrap",
            }}
          >
            {business?.siteContent?.logoUrl ? (
              <Image
                src={business.siteContent.logoUrl}
                alt={business.name}
                width={32}
                height={32}
                style={{ borderRadius: "50%", margin: "0 auto" }}
              />
            ) : (
              <em>{business?.name}</em>
            )}
          </Link>

          {/* ── Column 3 (right): icons ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            {searchOpen ? (
              <form
                onSubmit={handleSearchSubmit}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                  aria-label="Search products"
                  placeholder="Search…"
                  style={{
                    width: 140,
                    height: 30,
                    padding: "0 10px",
                    fontSize: 13,
                    fontFamily: "var(--font-sans, Manrope, sans-serif)",
                    letterSpacing: "0.02em",
                    color: "var(--el-ink, #1c1a17)",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--el-ink, #1c1a17)",
                    outline: "none",
                    borderRadius: 0,
                  }}
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  style={iconBtnStyle}
                  className="el-icon-btn"
                >
                  <X aria-hidden={true} style={{ width: 16, height: 16 }} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={openSearch}
                aria-label="Search products"
                style={iconBtnStyle}
                className="el-icon-btn"
              >
                <Search aria-hidden={true} style={{ width: 17, height: 17 }} />
              </button>
            )}

            {isPending ? (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "rgba(28,26,23,0.06)",
                }}
              />
            ) : user ? (
              <UserButton
                size="icon"
                classNames={{
                  trigger: {
                    base: "w-[34px] h-[34px] rounded-full",
                    avatar: { base: "w-[34px] h-[34px]" },
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
            ) : (
              <Link
                href="/auth/sign-in"
                style={iconBtnStyle}
                className="el-icon-btn"
                aria-label="Sign in"
              >
                <User aria-hidden={true} style={{ width: 17, height: 17 }} />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label={
                itemCount > 0
                  ? `Cart (${itemCount} item${itemCount === 1 ? "" : "s"})`
                  : "Cart"
              }
              style={{ ...iconBtnStyle, position: "relative" }}
              className="el-icon-btn"
            >
              <ShoppingBag
                aria-hidden={true}
                style={{ width: 17, height: 17 }}
              />
              <span
                aria-hidden={true}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  background: "var(--el-sage, #4a5240)",
                  color: "var(--el-paper, #fbf8f2)",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-sans, sans-serif)",
                  transform: itemCount > 0 ? "scale(1)" : "scale(0)",
                  transition: `transform 0.35s ${ease}`,
                }}
              >
                {itemCount}
              </span>
            </button>
          </div>
        </nav>

        {/* ── Mobile dropdown ── */}
        <div
          id="el-mobile-nav"
          aria-hidden={!menuOpen}
          style={{
            pointerEvents: menuOpen ? "auto" : "none",
            maxHeight: menuOpen ? 500 : 0,
            overflow: "hidden",
            transition: `max-height 0.4s ${ease}`,
            marginTop: 8,
          }}
        >
          <div
            style={{
              background: "rgba(251, 248, 242, 0.97)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(28, 26, 23, 0.08)",
              borderRadius: 20,
              padding: "20px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                tabIndex={menuOpen ? undefined : -1}
                aria-current={isActive(link.href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontSize: 16,
                  letterSpacing: "0.04em",
                  color: isActive(link.href)
                    ? "var(--el-ink, #1c1a17)"
                    : "var(--el-ink-soft, #6b6659)",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontWeight: isActive(link.href) ? 500 : 400,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Cart drawer */}
      <ElegantCartDrawer />
    </>
  );
}
