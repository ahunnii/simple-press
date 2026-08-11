"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DefaultHeaderTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { resolveFields } from "..";
import { RelocationPillButton } from "../shared/relocation-pill-button";
import { RelocationAboutDropdown } from "./relocation-about-dropdown";
import { RelocationMobileMenu } from "./relocation-mobile-menu";

/**
 * White, tall header (design.md → Chrome): circular Handy badge left, then a
 * right-aligned "About Us ▾" dropdown, Services, Contact Us, and the terracotta
 * "CALL US AT 313-241-0291" pill.
 *
 * Client component because it needs `usePathname()` for the active-link
 * underline and holds the mobile drawer's open state — the same mechanism
 * `CoopHeader` / `ViiHeader` use, since `DefaultLayoutTemplateProps` carries no
 * route info to thread down.
 *
 * Breakpoint: the clone's desktop starts at 1025px, so the hamburger owns
 * everything below that (`max-[1024px]:` / `min-[1025px]:` arbitrary variants —
 * the Tailwind config is never touched).
 */
export function RelocationHeader({ business }: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "relocation.global.branding.logo",
    "relocation.global.branding.logo-alt",
    "relocation.global.branding.about-label",
    "relocation.global.branding.backstory-label",
    "relocation.global.branding.reviews-label",
    "relocation.global.branding.faq-label",
    "relocation.global.branding.services-label",
    "relocation.global.branding.contact-label",
    "relocation.global.branding.phone-label",
    "relocation.global.branding.phone-href",
  ]);

  const businessName = business?.name ?? "Handy Relocations";
  // Owner-uploaded logo wins, as in every other template's header; the clone
  // badge is the shipped default.
  const logoSrc =
    business?.siteContent?.logoUrl ??
    f["relocation.global.branding.logo"] ??
    "";
  const logoAlt = f["relocation.global.branding.logo-alt"] ?? businessName;

  const aboutLabel = f["relocation.global.branding.about-label"] ?? "";
  const servicesLabel = f["relocation.global.branding.services-label"] ?? "";
  const contactLabel = f["relocation.global.branding.contact-label"] ?? "";
  const phoneLabel = f["relocation.global.branding.phone-label"] ?? "";
  const phoneHref = f["relocation.global.branding.phone-href"] ?? "";

  const aboutLinks = [
    {
      href: "/about",
      label: f["relocation.global.branding.backstory-label"] ?? "",
    },
    {
      href: "/testimonials",
      label: f["relocation.global.branding.reviews-label"] ?? "",
    },
    { href: "/faq", label: f["relocation.global.branding.faq-label"] ?? "" },
  ];

  const mobileLinks = [
    ...aboutLinks,
    { href: "/services", label: servicesLabel },
    { href: "/contact", label: contactLabel },
  ];

  const navLinkClass = (href: string) =>
    cn(
      "relocation-hover-fade relocation-nav-link py-1 [font-family:var(--font-relocation-display)] text-[1.0625rem] leading-6 text-[var(--relocation-ink)]",
      pathname === href && "relocation-nav-link--active",
    );

  return (
    <header
      {...sectionGroupAttr("global", "branding")}
      className="relative z-40 w-full bg-[var(--relocation-paper)]"
    >
      <div className="mx-auto flex w-full max-w-[85rem] items-center justify-between gap-6 px-6 py-4 min-[572px]:px-10 min-[1025px]:px-16 min-[1025px]:py-5">
        <Link
          href="/"
          aria-label={`${businessName} — Home`}
          className="relocation-hover-fade block shrink-0"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={logoAlt}
              width={560}
              height={603}
              // No rounded-full: the badge's script wordmark breaks outside
              // the circle, and the shipped asset is trimmed to content
              // (design.md → Chrome). Sized to the reference's visible art.
              className="block h-auto w-[4.5rem] object-contain min-[1025px]:w-[6.5rem]"
            />
          ) : (
            <span className="[font-family:var(--font-relocation-display)] text-[1.5rem] leading-8 font-bold text-[var(--relocation-ink)]">
              {businessName}
            </span>
          )}
        </Link>

        {/* ── Desktop nav — ≥1025px ─────────────────────────────────────── */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 min-[1025px]:flex"
        >
          <RelocationAboutDropdown
            label={aboutLabel}
            links={aboutLinks}
            activePath={pathname}
            labelAttrs={fieldAttr("relocation.global.branding.about-label")}
          />
          <Link
            href="/services"
            className={navLinkClass("/services")}
            aria-current={pathname === "/services" ? "page" : undefined}
            {...fieldAttr("relocation.global.branding.services-label")}
          >
            {servicesLabel}
          </Link>
          <Link
            href="/contact"
            className={navLinkClass("/contact")}
            aria-current={pathname === "/contact" ? "page" : undefined}
            {...fieldAttr("relocation.global.branding.contact-label")}
          >
            {contactLabel}
          </Link>
          <RelocationPillButton
            href={phoneHref}
            variant="solid"
            className="ml-1"
            labelAttrs={fieldAttr("relocation.global.branding.phone-label")}
          >
            {phoneLabel}
          </RelocationPillButton>
        </nav>

        {/* ── Hamburger — <1025px ───────────────────────────────────────── */}
        <button
          ref={hamburgerRef}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls={mobileMenuId}
          onClick={() => setMobileOpen(true)}
          className="relocation-hover-fade flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--relocation-ink)] min-[1025px]:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 28 18"
            width={28}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="block"
          >
            <path d="M1 5.5H27M1 12.5H27" />
          </svg>
        </button>
      </div>

      <RelocationMobileMenu
        id={mobileMenuId}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={mobileLinks}
        phoneLabel={phoneLabel}
        phoneHref={phoneHref}
        activePath={pathname}
        triggerRef={hamburgerRef}
      />
    </header>
  );
}
