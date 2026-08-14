"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Heart, MessageSquare, ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Button } from "~/components/ui/button";
import { HamburgerIcon } from "~/components/layout/hamburger-icon";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

/** Returns all keyboard-focusable elements inside `container`. */
function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest("[inert]"));
}

export function PollenHeader({ business }: DefaultHeaderTemplateProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession();
  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const user = session?.user;
  const shouldReduceMotion = useReducedMotion();

  // Refs for focus management
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const overlayCloseRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = useId();

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ??
    NAV_LINKS.filter((l) => l.href !== "/services" || isEnabled("services"));

  // --- Lock body scroll when menu is open ---
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // --- Focus management: move focus into overlay on open; restore on close ---
  const wasMobileOpenRef = useRef(false);
  useEffect(() => {
    if (mobileMenuOpen) {
      wasMobileOpenRef.current = true;
      // Small timeout so AnimatePresence has mounted the overlay
      const t = setTimeout(() => {
        overlayCloseRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    } else if (wasMobileOpenRef.current) {
      // Only restore focus when the menu was actually open (not on mount)
      wasMobileOpenRef.current = false;
      hamburgerRef.current?.focus();
    }
  }, [mobileMenuOpen]);

  // --- Inert background elements while mobile overlay is open ---
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const selectors = ["main#main-content", "footer", "header.pollen-header"];
    const els = selectors.flatMap((s) =>
      Array.from(document.querySelectorAll<HTMLElement>(s)),
    );
    els.forEach((el) => {
      el.inert = true;
    });
    return () => {
      els.forEach((el) => {
        el.inert = false;
      });
    };
  }, [mobileMenuOpen]);

  // --- Tab trap inside the mobile overlay ---
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const focusables = getFocusables(overlay);
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  // --- Escape key: close mobile menu ---
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);

  // --- Reduced-motion variants for overlay and per-link stagger ---
  const overlayTransitionDuration = shouldReduceMotion ? 0 : 0.2;
  const linkVariants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  const authActions = (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/auth/sign-up">Sign Up</Link>
      </Button>
    </>
  );

  const userMenu = user && (
    <UserButton
      size="icon"
      className="border-primary border"
      avatarClassName="size-10"
      links={[
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
        // /account/orders 404s when the owner disables the `orders` feature.
        ...(isStorefrontEnabled("orders")
          ? [
              {
                icon: <IconPackage className="h-4 w-4" />,
                label: "Orders",
                href: "/account/orders",
              },
            ]
          : []),
      ]}
    />
  );

  return (
    <>
      {/* C-1: add class so inert targeting works */}
      <header className="pollen-header bg-background border-border fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-28 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={closeMenu}
            >
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={resolveLogoAlt(
                    business.siteContent?.logoAltText,
                    business.name,
                  )}
                  width={100}
                  height={100}
                />
              ) : (
                <span className="text-xl font-bold">{business.name}</span>
              )}
            </Link>

            <nav className="hidden items-center justify-center gap-12 md:flex">
              {links.map(({ href, label }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative px-1 text-sm font-semibold tracking-wide uppercase transition-colors ${
                      isActive
                        ? "text-[#5e7747]"
                        : "text-[#4c566a] hover:text-[#5e7747]"
                    }`}
                  >
                    {label}
                    {isActive ? (
                      <span
                        className="absolute right-[-2px] -bottom-1 left-[-2px] h-0.5 bg-[#5e7747]"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className="absolute right-[-2px] -bottom-1 left-[-2px] h-0.5 scale-x-0 bg-[#5e7747] transition-transform duration-300 group-hover:scale-x-100"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              {/* Wishlist icon — no dedicated feature flag; unconditional like product-card hearts */}
              {isStorefrontEnabled("wishlist") && (
                <Link
                  href="/wishlist"
                  className="relative flex items-center p-2 text-[#4c566a] transition-colors hover:text-[#215935]"
                  aria-label={`Wishlist with ${wishlistCount} items`}
                >
                  <Heart className="size-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#215935] text-[10px] font-bold text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart icon */}

              {isEnabled("cart") && (
                <Link
                  href="/cart"
                  className="relative flex items-center p-2 text-[#4c566a] transition-colors hover:text-[#215935]"
                  aria-label={`Shopping cart with ${itemCount} items`}
                >
                  <ShoppingBag className="size-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#215935] text-[10px] font-bold text-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}

              <div className="hidden items-center gap-3 md:flex">
                {/* C-2 item 4: changed text-green-600 → text-green-700 hover:text-green-800 */}
                <Button
                  size="sm"
                  asChild
                  className="border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800 dark:border-green-400/30 dark:bg-green-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                  variant="outline"
                >
                  <Link href="/contact">
                    <MessageSquare className="mr-1.5 h-4 w-4" />
                    Get in Touch
                  </Link>
                </Button>

                {isStorefrontEnabled("customerAccounts") && (
                  <>
                    {isPending ? (
                      <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                    ) : user ? (
                      userMenu
                    ) : (
                      <></>
                    )}
                  </>
                )}
              </div>

              {/* C-1: hamburger gets aria-expanded + aria-controls */}
              <button
                ref={hamburgerRef}
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls={mobileMenuId}
                className="flex touch-manipulation items-center justify-center p-2 md:hidden"
                onClick={() => setMobileMenuOpen((o) => !o)}
              >
                <HamburgerIcon open={mobileMenuOpen} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* C-1: Mobile Menu Overlay — rendered only when open via AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            ref={overlayRef}
            id={mobileMenuId}
            key="pollen-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-60 flex flex-col bg-[#1A1E1A] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: overlayTransitionDuration }}
          >
            {/* C-1: close button receives focus on open via overlayCloseRef */}
            <button
              ref={overlayCloseRef}
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="text-primary-foreground absolute top-4 right-4 z-10 rounded-full p-2 transition-colors hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Logo + nav links centered */}
            <div className="flex flex-1 flex-col items-center justify-center px-4 pt-16 pb-8">
              {/* M-12: use business.name instead of hardcoded alt */}
              <Link
                href="/"
                onClick={closeMenu}
                className="mb-12 flex shrink-0 items-center justify-center"
              >
                <Image
                  src={business.siteContent?.logoUrl ?? "/placeholder.svg"}
                  alt={resolveLogoAlt(
                    business.siteContent?.logoAltText,
                    business.name,
                  )}
                  width={140}
                  height={140}
                  className="h-28 w-28 object-contain invert md:h-32 md:w-32"
                />
              </Link>

              <nav className="flex flex-col items-center gap-8">
                {links.map(({ href, label }, i) => {
                  const isActive =
                    href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <motion.div
                      key={href}
                      variants={linkVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : {
                              delay: 0.05 + i * 0.05,
                              duration: 0.25,
                            }
                      }
                    >
                      {/* M-2: aria-current in mobile nav */}
                      <Link
                        href={href}
                        onClick={closeMenu}
                        aria-current={isActive ? "page" : undefined}
                        className={`block rounded-lg px-4 py-2 text-2xl font-light tracking-wide uppercase transition-colors active:bg-white/10 ${
                          isActive
                            ? "text-[#5e7747]"
                            : "text-white hover:text-[#5e7747] active:text-[#5e7747]"
                        }`}
                      >
                        {label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Mobile Auth/Actions - below links */}
              <motion.div
                variants={linkVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        delay: 0.05 + links.length * 0.05,
                        duration: 0.25,
                      }
                }
                className="mt-12 flex flex-col items-center gap-4"
              >
                {/* C-2 item 4: changed text-green-600 → text-green-700 hover:text-green-800 */}
                <Button
                  size="sm"
                  asChild
                  className="border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800"
                  variant="outline"
                >
                  <Link href="/contact" onClick={closeMenu}>
                    <MessageSquare className="mr-1.5 h-4 w-4" />
                    Get in Touch
                  </Link>
                </Button>

                {/* Same `customerAccounts` gate the desktop cluster uses — the
                    drawer was offering sign-in links on stores that have
                    accounts turned off. */}
                {isStorefrontEnabled("customerAccounts") &&
                  (isPending ? (
                    <div className="bg-muted h-9 w-24 animate-pulse rounded" />
                  ) : user ? (
                    <div className="flex items-center gap-2">
                      <UserButton />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">{authActions}</div>
                  ))}
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
