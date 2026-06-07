"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import {
  IconLayoutDashboard,
  IconLogout,
  IconPackage,
} from "@tabler/icons-react";
import {
  Bell,
  BookUser,
  ChevronDown,
  ChevronUp,
  Lock,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

const MOBILE_ACCOUNT_LINKS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/security", label: "Security", icon: Lock },
  { href: "/account/address-book", label: "Address Book", icon: BookUser },
  { href: "/account/preferences", label: "Preferences", icon: Bell },
] as const;

const mobileNavItemVariants = {
  closed: { opacity: 0, y: 16 },
  open: { opacity: 1, y: 0 },
};

const mobileNavListVariants = {
  closed: {},
  open: {
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

export function NoiseHeader({ business, session }: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Set<number>>(new Set());
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuId = useId();

  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (accountMenuOpen) {
        setAccountMenuOpen(false);
      } else {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, accountMenuOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountMenuOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setAccountMenuOpen(false);
    setExpandedMobile(new Set());
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) setAccountMenuOpen(false);
  }, [mobileOpen]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const defaultNav: NavLink[] = [
    { href: "/", label: "Home" },
    ...(isEnabled("products") ? [{ href: "/shop", label: "What's New" }] : []),
    ...(isEnabled("collections")
      ? [{ href: "/collections", label: "Collections" }]
      : []),
    { href: "/about", label: "The Studio" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Blog" }] : []),
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Testimonials" }]
      : []),
    { href: "/contact", label: "Contact" },
  ];

  const navItems =
    (business?.siteContent?.navigationItems as NavLink[]) ?? defaultNav;

  const toggleMobileExpanded = (index: number) => {
    setExpandedMobile((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const closeMobileMenu = () => {
    setAccountMenuOpen(false);
    setMobileOpen(false);
  };

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;

  const isLinkActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const isParentActive = (link: NavLink) =>
    link.children?.some((c) => isLinkActive(c.href)) ?? false;

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "rounded-full w-auto h-auto p-0 border border-white/30",
          avatar: { base: "size-9" },
        },
      }}
      additionalLinks={[
        {
          icon: <IconPackage className="h-4 w-4" />,
          label: "Orders",
          href: "/account/orders",
        },
        ...(showAdminLink
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

  const authLink = !session?.user && (
    <Link href="/auth/sign-in" aria-label="Account">
      <User
        className="h-[18px] w-[18px] text-white/80 transition-opacity hover:opacity-70"
        strokeWidth={1.4}
      />
    </Link>
  );

  const brand = logoUrl ? (
    <div className="sl-brand-logo">
      <Image
        src={logoUrl}
        alt={businessName}
        fill
        sizes="(max-width: 768px) 161px, 207px"
        className="object-contain object-center md:object-left"
        priority
      />
    </div>
  ) : (
    <span className="sl-brand-text text-center font-heading leading-none md:text-left">
      {businessName}
    </span>
  );

  const renderMobileNavLink = (link: NavLink, i: number) => {
    if (link.children?.length) {
      return (
        <motion.div
          key={link.href + link.label}
          variants={mobileNavItemVariants}
          className="border-b border-white/10"
        >
          <button
            type="button"
            onClick={() => toggleMobileExpanded(i)}
            aria-expanded={expandedMobile.has(i)}
            className={cn(
              "font-heading flex w-full items-center justify-between py-4 text-3xl transition-colors sm:text-4xl",
              isParentActive(link) ? "sl-nav-active" : "sl-nav-inactive",
            )}
          >
            {link.label}
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                expandedMobile.has(i) ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
          </button>
          <AnimatePresence initial={false}>
            {expandedMobile.has(i) ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pb-3 pl-2">
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      target={child.external ? "_blank" : undefined}
                      rel={child.external ? "noopener noreferrer" : undefined}
                      onClick={closeMobileMenu}
                      aria-current={
                        isLinkActive(child.href) ? "page" : undefined
                      }
                      className={cn(
                        "font-heading block py-2.5 text-2xl transition-colors sm:text-3xl",
                        isLinkActive(child.href)
                          ? "sl-nav-active"
                          : "sl-nav-inactive",
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={link.href + link.label}
        variants={mobileNavItemVariants}
      >
        <Link
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
          onClick={closeMobileMenu}
          aria-current={isLinkActive(link.href) ? "page" : undefined}
          className={cn(
            "font-heading flex items-center border-b border-white/10 py-4 text-3xl transition-colors sm:text-4xl",
            isLinkActive(link.href) ? "sl-nav-active" : "sl-nav-inactive",
          )}
        >
          {link.label}
        </Link>
      </motion.div>
    );
  };

  return (
    <>
      <header className="sl-header sticky top-0 z-50 w-full">
        <div className="relative mx-auto flex h-[88px] w-full max-w-7xl items-center justify-between px-4 sm:h-[120px] sm:px-6">
          {/* Left: menu (mobile) / logo (desktop) */}
          <div className="z-10 flex min-w-[4.5rem] items-center justify-start sm:min-w-[5rem] md:min-w-0 md:flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-none border border-white/20 text-white/80 md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            <Link
              href="/"
              aria-label="Home"
              className="hidden shrink-0 md:flex"
            >
              {brand}
            </Link>
          </div>

          {/* Center: logo (mobile header bar) */}
          <Link
            href="/"
            aria-label="Home"
            className="absolute top-1/2 left-1/2 z-[1] flex max-w-[calc(100%-9rem)] -translate-x-1/2 -translate-y-1/2 justify-center md:hidden"
          >
            {brand}
          </Link>

          {/* Right: nav (desktop) + account + bag */}
          <div className="z-10 flex min-w-[4.5rem] items-center justify-end gap-4 sm:min-w-[5rem] sm:gap-5 md:min-w-0 md:flex-1">
            <nav
              className="hidden flex-nowrap items-center gap-[43.75px] px-7 md:flex lg:gap-10"
              aria-label="Primary navigation"
            >
              {navItems.map((link, i) =>
                link.children?.length ? (
                  <div
                    key={link.href + link.label}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(i)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={openDropdown === i}
                      onClick={() =>
                        setOpenDropdown(openDropdown === i ? null : i)
                      }
                      className={cn(
                        "vn-nav-link font-heading flex cursor-pointer items-center gap-1 border-none bg-transparent text-[27.5px] leading-none whitespace-nowrap transition-colors",
                        isParentActive(link)
                          ? "vn-active sl-nav-active"
                          : "sl-nav-inactive",
                      )}
                    >
                      {link.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          openDropdown === i ? "rotate-180" : "",
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {openDropdown === i && (
                      <div className="absolute top-full left-0 z-10 pt-2">
                        <div className="sl-dropdown-panel min-w-[200px] overflow-hidden rounded-none py-1 shadow-lg">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              target={child.external ? "_blank" : undefined}
                              rel={
                                child.external
                                  ? "noopener noreferrer"
                                  : undefined
                              }
                              aria-current={
                                isLinkActive(child.href) ? "page" : undefined
                              }
                              onClick={() => setOpenDropdown(null)}
                              className={cn(
                                "vn-nav-dropdown-link font-heading text-[22px] leading-none",
                                isLinkActive(child.href) ? "vn-active" : "",
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    aria-current={isLinkActive(link.href) ? "page" : undefined}
                    className={cn(
                      "vn-nav-link font-heading text-[27.5px] leading-none whitespace-nowrap transition-colors",
                      isLinkActive(link.href)
                        ? "vn-active sl-nav-active"
                        : "sl-nav-inactive",
                    )}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>

            <div className="hidden md:block">
              {session?.user ? userMenu : authLink}
            </div>

            <Link
              href="/cart"
              aria-label="View cart"
              className="relative flex items-center text-white/80 transition-opacity hover:opacity-70"
            >
              <ShoppingBag className="h-[25px] w-[25px]" strokeWidth={1.4} />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="sl-cart-badge absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[11.25px] font-semibold"
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Full-screen mobile navigation */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="sl-mobile-menu fixed inset-0 z-[60] flex flex-col md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              initial={{ y: 24 }}
              animate={{ y: 0 }}
              exit={{ y: 16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Top: logo + close */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  aria-label="Home"
                  className="flex min-w-0 flex-1 justify-start"
                >
                  {brand}
                </Link>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  aria-label="Close menu"
                  className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-white/20 text-white/80 transition-opacity hover:opacity-70"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <motion.nav
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-6 sm:px-6"
                aria-label="Mobile navigation"
                initial="closed"
                animate="open"
                exit="closed"
                variants={mobileNavListVariants}
              >
                {navItems.map((link, i) => renderMobileNavLink(link, i))}
              </motion.nav>

              {/* Bottom: cart + account */}
              <div className="relative shrink-0 border-t border-white/10 px-5 py-4 sm:px-6">
                <AnimatePresence>
                  {accountMenuOpen && session?.user ? (
                    <motion.div
                      ref={accountMenuRef}
                      id={accountMenuId}
                      role="menu"
                      aria-label="Account menu"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-5 bottom-full left-5 mb-2 overflow-hidden rounded-sm border border-white/15 bg-[#1f1f1f] shadow-lg sm:right-6 sm:left-6"
                    >
                      <div className="border-b border-white/10 px-4 py-3">
                        <p className="font-sans text-[10px] tracking-[0.18em] text-white/45 uppercase">
                          Signed in as
                        </p>
                        <p className="mt-1 truncate font-sans text-sm text-white/85">
                          {session.user.name ?? session.user.email}
                        </p>
                      </div>
                      <ul className="py-1">
                        {MOBILE_ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
                          <li key={href} role="none">
                            <Link
                              href={href}
                              role="menuitem"
                              onClick={closeMobileMenu}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 font-sans text-xs tracking-[0.14em] uppercase transition-colors hover:bg-white/5",
                                isLinkActive(href)
                                  ? "text-[var(--sl-coral)]"
                                  : "text-white/80",
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" aria-hidden />
                              {label}
                            </Link>
                          </li>
                        ))}
                        {showAdminLink ? (
                          <li role="none">
                            <Link
                              href="/admin"
                              role="menuitem"
                              onClick={closeMobileMenu}
                              className="flex items-center gap-3 px-4 py-3 font-sans text-xs tracking-[0.14em] text-white/80 uppercase transition-colors hover:bg-white/5"
                            >
                              <IconLayoutDashboard
                                className="h-4 w-4 shrink-0"
                                aria-hidden
                              />
                              Admin
                            </Link>
                          </li>
                        ) : null}
                        <li role="none" className="border-t border-white/10">
                          <Link
                            href="/auth/sign-out"
                            role="menuitem"
                            onClick={closeMobileMenu}
                            className="flex items-center gap-3 px-4 py-3 font-sans text-xs tracking-[0.14em] text-white/80 uppercase transition-colors hover:bg-white/5"
                          >
                            <IconLogout className="h-4 w-4 shrink-0" aria-hidden />
                            Sign out
                          </Link>
                        </li>
                      </ul>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/cart"
                    onClick={closeMobileMenu}
                    className="relative flex items-center justify-center gap-2 rounded-sm border border-white/20 px-4 py-3 font-sans text-xs tracking-[0.14em] text-white/85 uppercase transition-opacity hover:opacity-80"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    Cart
                    {itemCount > 0 ? (
                      <span className="sl-cart-badge ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                        {itemCount}
                      </span>
                    ) : null}
                  </Link>

                  {session?.user ? (
                    <button
                      type="button"
                      id={`${accountMenuId}-trigger`}
                      aria-haspopup="menu"
                      aria-expanded={accountMenuOpen}
                      aria-controls={accountMenuOpen ? accountMenuId : undefined}
                      onClick={() => setAccountMenuOpen((open) => !open)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-sm border px-4 py-3 font-sans text-xs tracking-[0.14em] uppercase transition-opacity hover:opacity-80",
                        accountMenuOpen
                          ? "border-[var(--sl-coral)] text-[var(--sl-coral)]"
                          : "border-white/20 text-white/85",
                      )}
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Account
                      <ChevronUp
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          accountMenuOpen ? "rotate-180" : "",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center gap-2 rounded-sm border border-white/20 px-4 py-3 font-sans text-xs tracking-[0.14em] text-white/85 uppercase transition-opacity hover:opacity-80"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
