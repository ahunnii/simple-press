"use client";

import type { Variants } from "motion/react";
import type { Ref, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TwitterLogoIcon } from "@radix-ui/react-icons";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { isActiveNavLink } from "~/lib/nav-utils";
import { cn } from "~/lib/utils";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

/** Fallback nav when the owner hasn't configured `navigationItems` — shared
 *  with the header's desktop nav so the two lists can't drift apart. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

const MENU_ID = "hb-mobile-menu";
const DEFAULT_TAGLINE = "Tree-free products · Crafted with care";
/** Matches Tailwind's `md` breakpoint — the menu has no business being open
 *  once the desktop nav is showing. */
const DESKTOP_QUERY = "(min-width: 768px)";

/** Stagger timing for the row fade-up. Capped so a long owner-configured nav
 *  doesn't stretch the entrance past a beat. */
const ROW_BASE_DELAY_S = 0.12;
const ROW_STEP_S = 0.045;
const ROW_MAX_STEPS = 8;
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

type SocialLinks = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
};

// ─── Toggle ────────────────────────────────────────────────────────────────

type MenuToggleProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The header passes this so the menu can hand focus back on Escape. */
  ref?: Ref<HTMLButtonElement>;
};

/**
 * HappyBambooMenuToggle — the bar's hamburger. Three bars morph into an X
 * with plain CSS transforms (the `.happy-bamboo` reduced-motion block in
 * globals.css already collapses the transition). It stays live while the
 * menu is open, since this is a disclosure, not a modal.
 */
export function HappyBambooMenuToggle({
  open,
  onOpenChange,
  ref,
}: MenuToggleProps) {
  const bar =
    "absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]";

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-controls={MENU_ID}
      aria-label={open ? "Close menu" : "Open menu"}
      onClick={() => onOpenChange(!open)}
      className="text-background hover:bg-background/10 focus-visible:ring-background relative inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors outline-none hover:text-[var(--hb-gold)] focus-visible:ring-2 md:hidden"
    >
      <span aria-hidden="true" className="relative block h-3.5 w-5">
        <span
          className={cn(bar, "top-0", open && "translate-y-1.5 rotate-45")}
        />
        <span className={cn(bar, "top-1.5", open && "scale-x-0 opacity-0")} />
        <span
          className={cn(bar, "top-3", open && "-translate-y-1.5 -rotate-45")}
        />
      </span>
    </button>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────

type MobileMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: DefaultHeaderTemplateProps["business"];
  /** Hydrated session from the header's `useHydratedSession` — the header
   *  owns it so the bar and the panel can't disagree. */
  session: HydratedSession;
  isPending: boolean;
  isEnabled: (key: string) => boolean;
  /** The sticky `<header>` — the panel hangs off its bottom edge, and its
   *  `.happy-bamboo` ancestor scopes the inert/scroll-lock lookups. */
  headerRef: RefObject<HTMLElement | null>;
  /** Focus returns here on Escape. */
  toggleRef: RefObject<HTMLButtonElement | null>;
};

/**
 * HappyBambooMobileMenu — a cream drop-down panel that unfolds beneath the
 * green bar (deliberately not bamboo's full-screen takeover). Rendered
 * inside `<header>` so it inherits every `--hb-*` token, the Outfit/Spectral
 * font vars, and any owner theme palette from the layout's `<main style>` —
 * the old portaled Sheet lost all three.
 *
 * Disclosure-navigation pattern: the toggle stays in the tab order, the
 * panel is unmounted when closed, and while open the page behind it is
 * scroll-locked and `inert` so Tab cycles only through the header + panel.
 */
export function HappyBambooMobileMenu({
  open,
  onOpenChange,
  business,
  session,
  isPending,
  isEnabled,
  headerRef,
  toggleRef,
}: MobileMenuProps) {
  const pathname = usePathname();

  // Close on any route change (back/forward, programmatic pushes) — link
  // taps close themselves, but not every navigation starts in the panel.
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  // Escape closes and hands focus back to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpenChange(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange, toggleRef]);

  // Crossing into `md+` (rotation, window resize) swaps in the desktop nav —
  // close so the page isn't left scroll-locked behind a hidden panel.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    if (mql.matches) {
      onOpenChange(false);
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) onOpenChange(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [open, onOpenChange]);

  // Scroll lock + inert background. Scoped to this template's wrapper so a
  // stray `#main-content` elsewhere (editor chrome, previews) is untouched.
  // Uses the attribute rather than the `.inert` property so it round-trips
  // cleanly (and works under jsdom). Restored on close and on unmount.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const scope: ParentNode =
      headerRef.current?.closest(".happy-bamboo") ?? document;
    const targets = [
      scope.querySelector<HTMLElement>("#main-content"),
      scope.querySelector<HTMLElement>("#main-content ~ footer"),
    ].filter((el): el is HTMLElement => !!el);
    const hadInert = targets.map((el) => el.hasAttribute("inert"));
    targets.forEach((el) => el.setAttribute("inert", ""));

    return () => {
      html.style.overflow = prevOverflow;
      targets.forEach((el, i) => {
        if (!hadInert[i]) el.removeAttribute("inert");
      });
    };
  }, [open, headerRef]);

  return (
    <AnimatePresence>
      {open && (
        <MobileMenuPanel
          key={MENU_ID}
          onClose={() => onOpenChange(false)}
          pathname={pathname}
          business={business}
          session={session}
          isPending={isPending}
          isEnabled={isEnabled}
          headerRef={headerRef}
        />
      )}
    </AnimatePresence>
  );
}

type MobileMenuPanelProps = Pick<
  MobileMenuProps,
  "business" | "session" | "isPending" | "isEnabled" | "headerRef"
> & {
  onClose: () => void;
  pathname: string;
};

/** Shared focus ring for panel controls — brand on cream (4.3:1, above the
 *  3:1 non-text minimum). */
const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--hb-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF6]";

function MobileMenuPanel({
  onClose,
  pathname,
  business,
  session,
  isPending,
  isEnabled,
  headerRef,
}: MobileMenuPanelProps) {
  const reduceMotion = useReducedMotion();

  // The panel can't be `position: fixed` — the header's backdrop-blur makes
  // it the containing block for fixed children — so it's absolutely placed
  // at the header's bottom and sized to the rest of the viewport. The
  // header's bottom moves with the announcement bar above it (scrolled to
  // the top vs. stuck), so measure on mount and on resize. Layout effect so
  // the first painted frame already has the right height; this component
  // only ever mounts client-side (the menu starts closed).
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const rect = headerRef.current?.getBoundingClientRect();
      if (rect) setHeaderBottom(Math.max(0, rect.bottom));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [headerRef]);

  const links =
    (business?.siteContent?.navigationItems as
      | { label: string; href: string }[]
      | undefined) ?? NAV_LINKS;
  const socialLinks = business?.siteContent?.socialLinks as
    | SocialLinks
    | undefined;
  // Blank owner text falls back too, not just a missing field.
  const footerText = business?.siteContent?.footerText;
  const tagline = footerText?.trim() ? footerText : DEFAULT_TAGLINE;

  const showAccount = isEnabled("customerAccounts") && !isPending;
  const isAdmin =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const socials = [
    {
      key: "facebook",
      label: "Facebook",
      href: socialLinks?.facebook,
      Icon: FacebookIcon,
    },
    {
      key: "instagram",
      label: "Instagram",
      href: socialLinks?.instagram,
      Icon: InstagramIcon,
    },
    {
      key: "twitter",
      label: "Twitter",
      href: socialLinks?.twitter,
      Icon: TwitterLogoIcon,
    },
    {
      key: "tiktok",
      label: "TikTok",
      href: socialLinks?.tiktok,
      Icon: TikTokIcon,
    },
    {
      key: "youtube",
      label: "YouTube",
      href: socialLinks?.youtube,
      Icon: YouTubeIcon,
    },
  ].filter((social) => !!social.href);

  // Clip-path unfold from the bar's edge; rows inherit the open/closed
  // labels and fade up on a capped stagger. Reduced motion → every
  // transition is instant (the globals.css guard only reaches CSS, not
  // JS-driven motion).
  const instant = { duration: 0 };
  const panelVariants: Variants = {
    closed: {
      clipPath: "inset(0% 0% 100% 0%)",
      transition: reduceMotion ? instant : { duration: 0.28, ease: EASE_OUT },
    },
    open: {
      clipPath: "inset(0% 0% 0% 0%)",
      transition: reduceMotion ? instant : { duration: 0.5, ease: EASE_OUT },
    },
  };
  const rowVariants: Variants = {
    closed: {
      opacity: 0,
      y: 12,
      transition: reduceMotion ? instant : { duration: 0.15 },
    },
    open: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? instant
        : {
            duration: 0.42,
            ease: EASE_OUT,
            delay:
              ROW_BASE_DELAY_S + Math.min(index, ROW_MAX_STEPS) * ROW_STEP_S,
          },
    }),
  };

  return (
    <motion.div
      id={MENU_ID}
      variants={panelVariants}
      initial={reduceMotion ? false : "closed"}
      animate="open"
      exit="closed"
      style={{
        height: `calc(100dvh - ${headerBottom ?? 64}px)`,
      }}
      className="absolute inset-x-0 top-full overflow-y-auto overscroll-contain border-t border-[var(--hb-gold)]/70 bg-[#FFFCF6] shadow-[inset_0_10px_12px_-12px_rgba(0,0,0,0.35)] md:hidden"
    >
      <div className="flex min-h-full flex-col px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <nav aria-label="Mobile navigation">
          <ul className="flex flex-col">
            {links.map((link, i) => {
              const active = isActiveNavLink(pathname, link.href);
              return (
                <motion.li
                  key={`${link.href}-${link.label}`}
                  custom={i}
                  variants={rowVariants}
                  className="border-b border-[var(--hb-brand)]/10"
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-16 items-center justify-between gap-4 py-4 font-serif text-3xl leading-tight transition-colors",
                      focusRing,
                      active
                        ? "text-[var(--hb-brand-deep)]"
                        : "text-foreground hover:text-[var(--hb-brand-deep)]",
                    )}
                  >
                    <span className="flex flex-col items-start">
                      {/* font-serif must sit on the text node's own element:
                          globals.css forces `.happy-bamboo *` to font-sans,
                          which beats the family inherited from the <a>. */}
                      <span className="font-serif">{link.label}</span>
                      {active && (
                        <span
                          aria-hidden="true"
                          className="mt-2 block h-0.5 w-10 rounded-full bg-[var(--hb-brand)]"
                        />
                      )}
                    </span>
                    {!active && (
                      <ArrowRight
                        aria-hidden="true"
                        className="size-5 shrink-0 text-[var(--hb-brand)] transition-transform duration-300 group-hover:translate-x-1"
                      />
                    )}
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        {/* Account block — pills when signed out, quiet rows when signed in.
            Sign-out stays on the bar's avatar menu. */}
        {showAccount && (
          <motion.div
            custom={links.length}
            variants={rowVariants}
            className="mt-8"
          >
            {session?.user ? (
              <>
                <p className="mb-1 text-xs font-medium tracking-[0.18em] text-[var(--hb-brand-muted)] uppercase">
                  Your account
                </p>
                <ul className="flex flex-col">
                  {[
                    { href: "/account", label: "My account" },
                    { href: "/account/orders", label: "Orders" },
                    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
                  ].map((item) => (
                    <li
                      key={item.href}
                      className="border-b border-[var(--hb-brand)]/10"
                    >
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={
                          pathname === item.href ? "page" : undefined
                        }
                        className={cn(
                          "flex min-h-12 items-center py-3 text-base transition-colors",
                          focusRing,
                          pathname === item.href
                            ? "font-medium text-[var(--hb-brand-deep)]"
                            : "text-foreground/80 hover:text-[var(--hb-brand-deep)]",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex flex-col gap-3 min-[420px]:flex-row">
                {/* Filled pill sits on --hb-brand-deep: white on the stock
                    --hb-brand is 4.36:1, just under AA for body-size text. */}
                <Link
                  href="/auth/sign-in"
                  onClick={onClose}
                  className={cn(
                    "inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--hb-brand-deep)] px-6 text-base font-medium text-white transition-opacity hover:opacity-90",
                    focusRing,
                  )}
                >
                  Log in
                </Link>
                <Link
                  href="/auth/sign-up"
                  onClick={onClose}
                  className={cn(
                    "inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[var(--hb-brand)] px-6 text-base font-medium text-[var(--hb-brand-deep)] transition-colors hover:bg-[var(--hb-brand)]/8",
                    focusRing,
                  )}
                >
                  Create account
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Bottom block — socials + tagline, pushed to the panel's foot. Gold
            only as the decorative rule; text stays brand/muted on cream. */}
        <motion.div
          custom={links.length + 1}
          variants={rowVariants}
          className="mt-auto pt-12"
        >
          {socials.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-3">
              {socials.map(({ key, label, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  aria-label={label}
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-full border border-[var(--hb-brand)]/60 text-[var(--hb-brand)] transition-colors hover:border-[var(--hb-brand)] hover:bg-[var(--hb-brand)]/8",
                    focusRing,
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
          <span
            aria-hidden="true"
            className="mb-3 block h-px w-10 bg-[var(--hb-gold)]"
          />
          <p className="text-sm leading-relaxed text-[var(--hb-brand-muted)]">
            {tagline}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
