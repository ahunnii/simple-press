"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import type { SocialNetworkKey } from "~/lib/social-links";
import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { resolveSocialLinks } from "~/lib/social-links";
import {
  externalLinkProps,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

// Pollen has never had a mega-menu, so the footer's Main Menu default mirrors
// the header's own NAV_LINKS (`pollen-header.tsx`) one-for-one. An owner who
// saves Admin → Content → Navigation entries with children gets those too —
// see the flatten below.
const mainMenuLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// Same route constants pollen-nav-overlay-account.tsx uses for the mobile
// overlay's account block, so the footer never drifts from it.
const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_UP_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`;
const ACCOUNT_HREF = `${AUTH_BASE_PATHS.settings}/${SETTINGS_VIEW_PATHS.account}`;
const ORDERS_HREF = `${AUTH_BASE_PATHS.settings}/orders`;

// Pollen's own line-art glyphs for the networks it has always drawn; any
// other network saved in Content → Branding (TikTok, Pinterest, YouTube)
// falls back to the shared registry icon from `~/lib/social-links`.
function PollenInstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="12"
        cy="12"
        r="5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PollenFacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M17 2.05C15.6731 1.85985 14.3256 1.84013 13 2C8.03 2.66 4 6.92 4 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.96-3.99-9-9-9zm1 9h-2.5V17h-3V11h-1.2V8.6h1.2V7.3C11.5 5.41 13.01 4.7 14.18 4.54c.82-.11 1.58.02 2.32.1V8.6H16c-1.1 0-2 .9-2 2v.01H18L17 11.05V11.05z"
        fill="currentColor"
      />
    </svg>
  );
}

function PollenTwitterIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M22 5.92c-.77.34-1.59.57-2.46.67a4.14 4.14 0 001.82-2.32 8.09 8.09 0 01-2.6 1c-.66-.71-1.61-1.16-2.67-1.16-2.02 0-3.66 1.68-3.66 3.74 0 .3.03.59.1.86-3.04-.15-5.74-1.64-7.55-3.9-.33.58-.52 1.25-.52 1.97 0 1.35.65 2.52 1.64 3.21-.6-.02-1.16-.19-1.66-.46v.05c0 1.89 1.28 3.47 3.08 3.83-.31.09-.65.15-1.02.15-.25 0-.48-.04-.71-.07.48 1.55 1.87 2.7 3.52 2.73A8.16 8.16 0 012 19.14a11.5 11.5 0 006.29 1.89c7.55 0 11.69-6.38 11.69-11.92 0-.18-.01-.37-.02-.55A8.8 8.8 0 0022 5.92z"
        fill="currentColor"
      />
    </svg>
  );
}

function PollenLinkedinIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M7.75 17V10.75M7.75 7V7.00889M12 17V13.5C12 12.6716 12.6716 12 13.5 12V12C14.3284 12 15 12.6716 15 13.5V17M7.75 7.00546H7.75999"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const POLLEN_SOCIAL_ICONS: Partial<
  Record<SocialNetworkKey, () => React.JSX.Element>
> = {
  instagram: PollenInstagramIcon,
  facebook: PollenFacebookIcon,
  twitter: PollenTwitterIcon,
  linkedin: PollenLinkedinIcon,
};

export function PollenFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phoneNumber = business?.phoneNumber;
  const physicalAddress = business?.businessAddress;
  const footerTagline = business?.siteContent?.footerText?.trim();
  const { isEnabled } = resolveFlags(business?.featureFlags);

  // Client component (no SSR session seed — pollen's own header calls
  // `useHydratedSession()` unseeded too; `DefaultFooterTemplateProps` has no
  // `initialSession` and no storefront footer fetches one server-side, so
  // this keeps the account column self-contained without touching
  // `pollen-layout.tsx` or the shared footer prop type).
  const { data: session, isPending } = useHydratedSession();
  const user = session?.user;

  // Same list as the header (`pollen-header.tsx`'s NAV_LINKS), flattened:
  // each top-level link, then its children right after it (mirrors
  // happy-bamboo-footer.tsx's `quickLinks`). An owner-saved nav with no
  // children behaves exactly like the old flat list did.
  const footerNav = resolveNav(
    business?.siteContent?.navigationItems,
    mainMenuLinks.filter(
      (l) => l.href !== "/services" || isEnabled("services"),
    ),
  ).flatMap((item) => [
    ...(item.href ? [item] : []),
    ...(item.children ?? []).filter((child) => child.href),
  ]);

  const accountsEnabled = isEnabled("customerAccounts");
  const ordersEnabled = isEnabled("orders");

  const socialLinks = resolveSocialLinks(business?.siteContent?.socialLinks);

  return (
    <footer className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:gap-16">
          {/* Left: Logo and Contact */}
          <div>
            <Link href="/" className="mb-6 inline-block">
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={resolveLogoAlt(
                    business.siteContent?.logoAltText,
                    business.name,
                  )}
                  width={120}
                  height={120}
                />
              ) : (
                <span className="text-xl font-bold">{business.name}</span>
              )}
            </Link>
            <div className="space-y-3 text-sm leading-relaxed text-[#6b7280]">
              {!!footerTagline && (
                <p className="max-w-xs text-[#4b5563]">{footerTagline}</p>
              )}
              {!!phoneNumber && (
                <p className="flex items-center gap-2">
                  <Phone className="size-4" aria-hidden="true" />
                  <a
                    href={`tel:${phoneNumber}`}
                    className="transition-colors hover:text-[#374151]"
                  >
                    {phoneNumber}
                  </a>
                </p>
              )}
              {!!email && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4" />
                  <a
                    href={`mailto:${email}`}
                    className="transition-colors hover:text-[#374151]"
                  >
                    {email}
                  </a>
                </p>
              )}
              {!!physicalAddress && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" /> {physicalAddress}
                </p>
              )}
            </div>
          </div>

          {/* Middle: Main Menu */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-[#374151]">
              Main Menu
            </h4>
            <ul className="space-y-3">
              {footerNav.map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    {...externalLinkProps(link.external)}
                    className="text-sm text-[#6b7280] transition-colors hover:text-[#374151]"
                  >
                    {link.label}
                    {link.external && (
                      <span className="sr-only"> (opens in new tab)</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Account — omitted when customerAccounts is off */}
          {accountsEnabled && (
            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#374151]">
                Account
              </h4>
              <ul className="space-y-3">
                {isPending ? (
                  <>
                    <li>
                      <span className="bg-muted block h-4 w-24 animate-pulse rounded" />
                    </li>
                    <li>
                      <span className="bg-muted block h-4 w-20 animate-pulse rounded" />
                    </li>
                  </>
                ) : user ? (
                  <>
                    <li>
                      <Link
                        href={ACCOUNT_HREF}
                        className="text-sm text-[#6b7280] transition-colors hover:text-[#374151]"
                      >
                        My account
                      </Link>
                    </li>
                    {ordersEnabled && (
                      <li>
                        <Link
                          href={ORDERS_HREF}
                          className="text-sm text-[#6b7280] transition-colors hover:text-[#374151]"
                        >
                          Orders
                        </Link>
                      </li>
                    )}
                  </>
                ) : (
                  <>
                    <li>
                      <Link
                        href={SIGN_IN_HREF}
                        className="text-sm text-[#6b7280] transition-colors hover:text-[#374151]"
                      >
                        Sign in
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={SIGN_UP_HREF}
                        className="text-sm text-[#6b7280] transition-colors hover:text-[#374151]"
                      >
                        Create account
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[#e5e7eb] pt-8 md:flex-row">
          <p className="text-sm text-[#6b7280]">
            Copyright © {new Date().getFullYear()} {business.name}. All rights
            reserved.
          </p>

          {/* Social Links — Content → Branding, via the shared registry */}
          {/* M-11: p-2 raises hit area to ≥24px; M-3: sr-only new-tab warning; svg aria-hidden */}
          {socialLinks.length > 0 && (
            <ul
              className="flex items-center gap-2"
              aria-label={`Follow ${business.name}`}
            >
              {socialLinks.map(({ key, ariaLabel, Icon, url }) => {
                const PollenIcon = POLLEN_SOCIAL_ICONS[key];
                return (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 text-[#6b7280] transition-colors hover:text-[#374151]"
                    >
                      {PollenIcon ? (
                        <PollenIcon />
                      ) : (
                        <Icon className="size-5" />
                      )}
                      <span className="sr-only">
                        {ariaLabel} (opens in new tab)
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
