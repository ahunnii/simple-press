import Link from "next/link";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import {
  externalLinkProps,
  resolveFooterQuickLinks,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";
import {
  BambooWaveLeaves,
  BambooWaveSprig,
} from "../shared/bamboo-wave-leaves";
import { BambooFooterAccount } from "./bamboo-footer-account";
import {
  BambooSocialIcons,
  readBambooSocialLinks,
} from "./bamboo-social-icons";

/** Same shipped default as `bamboo-header.tsx`'s `BAMBOO_DEFAULT_NAV` — see
 *  that file's comment for why the three chrome files each keep their own
 *  copy instead of sharing a `lib/` module. */
const BAMBOO_DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

const columnHeadingClass =
  "mb-4 text-xs font-semibold tracking-widest text-[var(--bam-gold-soft)] uppercase";
const columnLinkClass =
  "text-sm text-[var(--bam-cream)]/80 transition-colors hover:text-[var(--bam-cream)]";

/**
 * BambooFooter — the forest slab. Four columns (brand + socials, quick links,
 * policies, connect) over a hairline-separated bottom bar carrying the
 * copyright and the owner-editable footer note.
 *
 * The slab opens with the template's canonical wave (signature moment #3) so
 * every page flows into the footer instead of hitting a hard forest edge. The
 * `<footer>` itself is transparent: the wave's negative top margin lets its
 * transparent-above area composite over whatever the previous section painted
 * (cream, cream-deep, or forest-deep), and the forest background starts on the
 * inner div below the curve. Every page's final section carries at least
 * `py-16`, so the 40/56px overlap never reaches content. The wave is the
 * vivid metallic `hairline` line, like the value band's.
 *
 * A single wave sprig (`shared/bamboo-wave-leaves.tsx`) grows from the gold
 * line at the RIGHT edge, the diagonal mirror of the nav bar's top-left
 * corner sprig. The wave and its leaf layer share one `relative` wrapper
 * that carries the negative margin (the value band's pattern), so the
 * sprig's `top-*` is its root depth measured from the wave's top edge, and
 * `z-[2]` lifts it over the previous section's positioned layers (the
 * sustainability band's flipped bottom wave is `z-[1]`). The sprig tops out
 * 12-20px above the wave, so its intrusion into the previous section
 * (overlap + rise, ≤69px) stays in that section's bottom padding; its root
 * sits well above the footer's own `py-16` content.
 */
export async function BambooFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const name = business?.name ?? "Business Name";
  const footerTagline = business?.siteContent?.footerText;
  const address = business?.businessAddress;

  const { isEnabled } = await getBusinessFlags();

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  // Owner's flat footer Quick Links (falls back to the main nav's top level
  // when unset; an explicit `[]` means "no quick links"). The shared
  // route→flag filter (P-NAV-FLAGS) drops anything the business has switched
  // off, same as the header and mobile sheet.
  const quickLinks = resolveFooterQuickLinks({
    footerItems: business?.siteContent?.footerNavigationItems,
    navigationItems: business?.siteContent?.navigationItems,
    navDefaults: BAMBOO_DEFAULT_NAV,
    isEnabled,
  });

  // Mandatory, non-hideable policy row (B10.1, PF9) — published merchant
  // Pages by slug; privacy/terms fall back to the platform's own policy
  // since every store is covered by it regardless of what it has published.
  // Shipping and refund have no platform equivalent, so they only appear
  // once published. Only these four standard slugs plus Platform Policies —
  // any other policy-type page (imports, seed data) is never auto-listed.
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");
  const shippingPolicy = policies.find((p) => p.slug === "shipping-policy");
  const refundPolicy = policies.find((p) => p.slug === "refund-policy");

  const policyLinks: { label: string; href: string }[] = [
    {
      label: "Privacy Policy",
      href: privacyPolicy
        ? `/${privacyPolicy.slug}`
        : "/platform/policies/privacy-policy",
    },
    {
      label: "Terms of Service",
      href: termsOfService
        ? `/${termsOfService.slug}`
        : "/platform/policies/terms-of-service",
    },
    ...(shippingPolicy
      ? [{ label: "Shipping Policy", href: `/${shippingPolicy.slug}` }]
      : []),
    ...(refundPolicy
      ? [{ label: "Refund Policy", href: `/${refundPolicy.slug}` }]
      : []),
    { label: "Platform Policies", href: "/platform/policies/" },
  ];

  const socialLinks = readBambooSocialLinks(business?.siteContent?.socialLinks);

  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.global.footer-note",
  ]);
  const footerNote = f["bamboo.global.footer-note"]?.trim() ?? "";

  return (
    <footer>
      <div className="pointer-events-none relative -mt-10 -mb-px md:-mt-14">
        <BambooWaveDivider variant="hairline" className="h-10 md:h-14" />

        <BambooWaveLeaves className="z-[2]">
          <BambooWaveSprig
            side="right"
            className="top-11 w-24 opacity-90 md:top-[4.5rem] md:w-32 lg:top-[5.25rem] lg:w-36"
          />
        </BambooWaveLeaves>
      </div>

      <div className="bg-[var(--bam-forest)] text-[var(--bam-cream)]">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Leaf
                  className="size-5 text-[var(--bam-gold-soft)]"
                  aria-hidden="true"
                />
                <span className="font-serif text-xl">{name}</span>
              </Link>
              {!!footerTagline && (
                <p className="max-w-xs text-sm leading-relaxed text-[var(--bam-cream)]/80">
                  {footerTagline}
                </p>
              )}
              <BambooSocialIcons
                socialLinks={socialLinks}
                label={`Follow ${name}`}
                className="mt-1 gap-3"
                linkClassName="size-9 rounded-full border border-[var(--bam-gold-soft)]/40 text-[var(--bam-gold-soft)] hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)]"
              />
            </div>

            {/* Quick links — hidden entirely when there's nothing to show
                (no resolved links and accounts are off), rather than
                rendering an empty heading. */}
            {(quickLinks.length > 0 || isEnabled("customerAccounts")) && (
              <div>
                <h2 className={columnHeadingClass}>Quick Links</h2>
                <nav
                  className="flex flex-col gap-2.5"
                  aria-label="Quick links"
                >
                  {quickLinks.map((link, i) => (
                    <Link
                      key={`${link.href}-${i}`}
                      href={link.href}
                      {...externalLinkProps(link.external)}
                      className={columnLinkClass}
                    >
                      {link.label}
                      {link.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </Link>
                  ))}
                  {/* Account entry, end of Quick Links (B10.3, PF10) — gated
                      on customerAccounts, own client component since the
                      footer itself is a server component. */}
                  {isEnabled("customerAccounts") && (
                    <BambooFooterAccount
                      ordersEnabled={isEnabled("orders")}
                      linkClassName={columnLinkClass}
                    />
                  )}
                </nav>
              </div>
            )}

            {/* Policies — always rendered (B10.1, PF9), exactly these five
                slots. */}
            <div>
              <h2 className={columnHeadingClass}>Policies</h2>
              <nav
                className="flex flex-col gap-2.5"
                aria-label="Customer care links"
              >
                {policyLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={columnLinkClass}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Connect */}
            <div>
              <h2 className={columnHeadingClass}>Connect</h2>
              <address className="flex flex-col gap-2.5 text-sm text-[var(--bam-cream)]/80 not-italic">
                <span>{name}</span>
                {!!address && <span>{address}</span>}
                {!!phone && (
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="transition-colors hover:text-[var(--bam-cream)]"
                  >
                    {phone}
                  </a>
                )}
                {!!email && (
                  <a
                    href={`mailto:${email}`}
                    className="transition-colors hover:text-[var(--bam-cream)]"
                  >
                    {email}
                  </a>
                )}
              </address>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--bam-gold-soft)]/20 pt-8 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-[var(--bam-cream)]/70">
              &copy; {new Date().getFullYear()} {name}. All rights reserved.
            </p>
            {!!footerNote && (
              <p
                className="text-xs tracking-wide text-[var(--bam-gold-soft)]"
                {...fieldAttr("bamboo.global.footer-note")}
              >
                {footerNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
