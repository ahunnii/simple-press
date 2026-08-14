"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DefaultHeaderTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { CoopMobileMenu } from "./coop-mobile-menu";

const LOGO_SRC = "/templates/coop/images/5844387ee755.png";
const LOGO_SRC_SET =
  "/templates/coop/images/131cc0430844.png 100w, /templates/coop/images/d956ad319e0c.png 300w, /templates/coop/images/68c314a72ca5.png 500w, /templates/coop/images/57ef1cb9199d.png 750w, /templates/coop/images/68886832df7d.png 1000w, /templates/coop/images/da7e5fdadaaa.png 1500w, /templates/coop/images/e73c320adf3c.png 2500w";

/**
 * Building Cooperatively's header has two variants in the clone (see
 * `docs/templates/coop/design.md` Chrome):
 *  - Homepage: absolute overlay over the hero, transparent, white nav links.
 *  - Every other page: static, `bg-background`, `--coop-color-001` nav links.
 *
 * Like `ViiHeader`, the variant is chosen client-side via `usePathname()`
 * rather than threading a prop through `CoopLayout` — the layout contract
 * (`DefaultLayoutTemplateProps`) has no route info to pass down, and this is
 * the same mechanism the vii pilot template already uses for the identical
 * transparent-on-homepage / solid-elsewhere pattern.
 *
 * The mobile bar + slide-in menu (clone data-cid n1–n27) and the desktop nav
 * (n33–n45 homepage / n20–n32 inner) are both always mounted; only one is
 * visible at a given viewport width via the coop-md breakpoint, exactly as
 * the clone's own CSS-only responsive toggle works.
 */
export function CoopHeader({ business }: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const overlay = pathname === "/";

  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "coop.global.header.galleryLabel",
    "coop.global.header.galleryHref",
  ]);
  const galleryLabel =
    f["coop.global.header.galleryLabel"] ?? "Project Gallery Page";
  const galleryHref =
    f["coop.global.header.galleryHref"] ?? "/project-gallery-page";

  const businessName = business?.name ?? "Building Cooperatively";
  // Owner-uploaded logo takes priority (matches every other template, e.g.
  // DefaultHeader's `business.siteContent?.logoUrl` check). Falls back to
  // the hardcoded clone logo so the pixel-exact demo keeps looking right
  // when no owner logo has been set.
  const ownerLogoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );
  const navLinkColorClass = overlay
    ? "text-[var(--coop-background)]"
    : "text-[var(--coop-color-001)]";

  const mobileLinks = [
    { href: "/", label: "Home" },
    { href: galleryHref, label: galleryLabel },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      {/* ── Mobile bar + slide-in menu — visible only <572px ───────────── */}
      <div
        className="max-coop-md:block hidden"
        {...sectionGroupAttr("global", "branding")}
      >
        <div className="flex items-center justify-center bg-[var(--coop-background)] px-3 py-2 text-center">
          <div className="flex max-w-full min-w-0 grow items-center justify-start text-left">
            <Link
              href="/"
              className="block min-w-0 shrink-0 cursor-pointer p-2 leading-0"
              aria-label={`${businessName} — Home`}
            >
              <img
                className="max-coop-md:h-19.5 block w-20"
                alt={logoAlt}
                {...(ownerLogoUrl
                  ? { src: ownerLogoUrl }
                  : { sizes: "240px", src: LOGO_SRC, srcSet: LOGO_SRC_SET })}
              />
            </Link>
          </div>

          <div className="flex max-w-full min-w-0 grow items-center justify-end text-right">
            <button
              ref={hamburgerRef}
              type="button"
              className="block min-w-0 shrink-0 cursor-pointer p-2 text-center leading-0"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls={mobileMenuId}
              onClick={() => setMobileOpen(true)}
            >
              {/* Sprite lines are fill="none" — they only paint via stroke.
                  The --even variant matches the even (2px) stroke width. */}
              <svg
                className="block h-4.5 w-6 overflow-hidden"
                viewBox="0 0 24 18"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <use xlinkHref="/templates/coop/ui-icons.svg#hamburger-icon--even" />
              </svg>
            </button>
          </div>
        </div>

        <CoopMobileMenu
          id={mobileMenuId}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          links={mobileLinks}
          triggerRef={hamburgerRef}
        />
      </div>

      {/* ── Desktop header — visible only ≥572px ───────────────────────── */}
      <header
        className={
          overlay
            ? "max-coop-md:hidden absolute inset-x-0 z-1000 block h-[10.4rem]"
            : "max-coop-md:hidden block bg-[var(--coop-background)]"
        }
      >
        <div className="max-coop-md:hidden coop-md:max-coop-lg:px-[1.3125rem] mx-auto flex h-[10.4rem] max-w-425 items-center justify-center px-40 pt-10 text-center">
          <div className="flex max-w-full min-w-0 grow items-center justify-start text-left">
            <Link
              href="/"
              className="block h-[7.9rem] shrink-0 cursor-pointer px-[0.9375rem] py-[0.3125rem] leading-0"
              aria-label={`${businessName} — Home`}
            >
              <img
                className="block h-29 w-30 max-w-30 overflow-clip"
                alt={logoAlt}
                {...(ownerLogoUrl
                  ? { src: ownerLogoUrl }
                  : { sizes: "320px", src: LOGO_SRC, srcSet: LOGO_SRC_SET })}
              />
            </Link>
          </div>

          <div className="flex h-6 max-w-full min-w-0 grow items-center justify-end text-right">
            <nav
              className="block h-6 shrink-0 px-[0.9375rem] py-[0.3125rem] [font-family:var(--font-coop-label)] text-sm leading-3.5 tracking-[0.42px] text-nowrap whitespace-nowrap uppercase"
              aria-label="Primary navigation"
            >
              <div className="-m-[0.5375rem] block">
                <Link
                  href="/"
                  className={`mx-[0.5375rem] inline-block cursor-pointer py-[0.5375rem] align-middle ${navLinkColorClass}`}
                >
                  Home
                </Link>
                <Link
                  href={galleryHref}
                  className={`mx-[0.5375rem] inline-block cursor-pointer py-[0.5375rem] align-middle ${navLinkColorClass}`}
                  {...fieldAttr("coop.global.header.galleryLabel")}
                >
                  {galleryLabel}
                </Link>
                <Link
                  href="/about"
                  className={`mx-[0.5375rem] inline-block cursor-pointer py-[0.5375rem] align-middle ${navLinkColorClass}`}
                >
                  About Us
                </Link>
                <Link
                  href="/contact"
                  className={`mx-[0.5375rem] inline-block cursor-pointer py-[0.5375rem] align-middle ${navLinkColorClass}`}
                >
                  Contact
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
