"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DefaultFooterTemplateProps } from "../../types";
import type { Session } from "~/server/better-auth/config";
import { resolveDonationLabel } from "~/lib/donations/label";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import {
  getRawCustomFieldString,
  parseTemplateListRows,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import {
  externalLinkProps,
  filterNavByFlags,
  getAccountNavLinks,
  resolveFooterNav,
  type NavChild,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { PinkFooterAccount } from "./pink-footer-account";
import { PinkSocialLinks } from "../shared/pink-social-links";
import { PinkWordmarkSvg } from "../shared/pink-wordmark-svg";

/** A resolved footer link, optionally tagged with its position in the
 *  SAVED `pink.global.footer-col1-links` / `footer-col2-links` list (never
 *  set for a link sourced from the Admin footer-quick-links list or from
 *  pink's own built-in defaults) — only a tagged row gets `data-sp-item`. */
type FooterLinkRow = NavChild & { itemIndex?: number };

type PinkFooterProps = DefaultFooterTemplateProps & {
  /** The layout's server-side session, seeding the account rows (B10.3) so
   *  they never flash. */
  initialSession?: Session | null;
  /**
   * Design.md → Chrome → Footer: dark is canonical (12/14 designs); About
   * and the blog post page use the light/paper variant. When omitted, the
   * tone is inferred from the current route so `PinkLayout` (which renders
   * the footer for every page) doesn't need route awareness itself.
   */
  tone?: "dark" | "light";
  /**
   * Privacy Policy / Terms of Service, resolved server-side in `PinkLayout`
   * (real published pages, or the `/platform/policies/*` fallback — see
   * `default-footer.tsx`). Merged ahead of the owner's custom
   * `pink.global.footer-legal-links` so a fresh store always ships real
   * legal links (review-2026-07-29.md F6).
   */
  resolvedLegalLinks?: { label: string; url: string }[];
};

const FIELD_KEYS = [
  "pink.global.accent-word",
  "pink.global.footer-brand-mark",
  "pink.global.footer-logo",
  "pink.global.footer-col1-title",
  "pink.global.footer-col2-title",
];

/**
 * Trims `value` and maps blank to `undefined`, so "saved value or fallback"
 * reads as a plain `??` chain — a cleared field or Settings column saves as
 * `""`, which `??` alone would treat as a real value. Local copy of noise's
 * `nonBlank` rather than a cross-template import.
 */
function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}

function isLightFooterRoute(pathname: string): boolean {
  return pathname === "/about" || /^\/blog\/[^/]+\/?$/.test(pathname);
}

/** Mirrors the split used in `pink-header.tsx` — see that file for details. */
function splitAccentWordmark(name: string, accentWord: string) {
  const trimmedAccent = accentWord.trim();
  if (
    !trimmedAccent ||
    !name.toLowerCase().endsWith(trimmedAccent.toLowerCase())
  ) {
    return { matches: false as const };
  }
  const splitIndex = name.length - trimmedAccent.length;
  return {
    matches: true as const,
    prefix: name.slice(0, splitIndex),
    tail: name.slice(splitIndex),
  };
}

/**
 * Every part of the footer — brand column, link columns, legal strip —
 * belongs to the single `global.footer` section, so all three wrappers carry
 * the same `sectionGroupAttr`; the preview overlay dedupes them into one
 * hotspot and focus lands on the first. The section is not hideable: the
 * social row and the legal links each disappear on their own once their
 * source list is empty, so a toggle would have nothing left to do.
 */
export function PinkFooter({
  business,
  tone,
  resolvedLegalLinks,
  initialSession,
}: PinkFooterProps) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const resolvedTone: "dark" | "light" =
    tone ?? (isLightFooterRoute(pathname ?? "") ? "light" : "dark");
  const isLight = resolvedTone === "light";

  const businessName = business?.name ?? "";
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );
  const rawCustomFields = business?.siteContent?.customFields;
  const customFields = rawCustomFields as Record<string, unknown> | undefined;
  const f = resolveFields(rawCustomFields, FIELD_KEYS);

  const accentWord = f["pink.global.accent-word"] ?? "";
  const wordmark = splitAccentWordmark(businessName, accentWord);
  // Tagline: Content → Branding → Footer tagline wins; else the legacy
  // `pink.global.footer-blurb` field (retired 2026-09-26, a read-only
  // fallback — never written or cleared from here); else hidden.
  const footerTagline =
    nonBlank(business?.siteContent?.footerText) ??
    nonBlank(getRawCustomFieldString(customFields, "pink.global.footer-blurb"));

  // ── What the footer shows as the brand ──
  // Three-way owner choice, expressed with the two field types the platform
  // already has (there is no select/enum type): a switch picks the traced
  // mark, and everything below it is a fallback chain. Precedence:
  //
  //   1. the traced PINKART mark          — switch on (off by default
  //                                          since 2026-09-26)
  //   2. `pink.global.footer-logo`        — a footer-specific upload
  //   3. `siteContent.logoUrl`            — whatever the header already uses
  //   4. the live-text wordmark           — always available, never blank
  //
  // Steps 2 and 3 are separate on purpose: the footer is dark on most routes,
  // so a header logo drawn in dark ink disappears there. The dedicated field
  // is where an owner puts the light version, and it wins when set.
  // Only an explicit "true" turns the mark on; `resolveFields` fills an
  // unsaved switch with the field default ("false").
  const useWordmarkSvg = f["pink.global.footer-brand-mark"] === "true";
  const footerLogo = (f["pink.global.footer-logo"] ?? "").trim();
  // Not `??` — an EMPTY footer-logo field must fall through to the branding
  // logo, and an empty one of those through to the text build. Only a real
  // value stops the chain.
  const brandLogoUrl =
    footerLogo !== "" ? footerLogo : (business?.siteContent?.logoUrl ?? "");

  const socialLinks = resolveSocialLinks(business?.siteContent?.socialLinks);

  const col1Title = f["pink.global.footer-col1-title"] ?? "Shop";
  const col2Title = f["pink.global.footer-col2-title"] ?? "Studio";
  const col1LinksRaw = parseTemplateListRows(
    customFields?.["pink.global.footer-col1-links"],
  ) as { _id?: string; label?: string; url?: string }[];
  const col2LinksRaw = parseTemplateListRows(
    customFields?.["pink.global.footer-col2-links"],
  ) as { _id?: string; label?: string; url?: string }[];

  const toFooterLinkRows = (
    rows: { label?: string; url?: string }[],
  ): FooterLinkRow[] =>
    rows
      .map((row, i) => ({
        label:
          typeof row.label === "string" && row.label.trim() !== ""
            ? row.label
            : "Link",
        href: typeof row.url === "string" ? row.url : "",
        itemIndex: i,
      }))
      .filter((row) => row.href.trim() !== "");

  // ── Shop column (col1): pink's own field list, unchanged (PF19/B10.2) —
  // an owner-saved list wins, else pink's defaults. Every entry (saved or
  // default) is flag-filtered last, which is what gates "Shop all" on
  // `products` and drops "Collections"/"Services" when their own flags are
  // off — the same shared helper every P-NAV-FLAGS adopter uses instead of
  // the old inline `isEnabled` checks baked into the fallback array.
  const col1Source: FooterLinkRow[] =
    col1LinksRaw.length > 0
      ? toFooterLinkRows(col1LinksRaw)
      : [
          { label: "Shop all", href: "/shop" },
          { label: "Collections", href: "/collections" },
          { label: "Services", href: "/services" },
        ];
  const shopLinks = filterNavByFlags(
    col1Source,
    isEnabled,
  ) as FooterLinkRow[];

  // ── Studio column (col2) is now the shared footer quick links (PF19,
  // decision 2026-09-28): Admin's footer quick links
  // (`SiteContent.footerNavigationItems`) win when set (even an explicit
  // empty list — `resolveFooterNav`'s `Array.isArray` check, never `??`);
  // else the owner's saved `pink.global.footer-col2-links` rows; else
  // pink's own defaults. Flag-filtered last either way (the umsc pattern).
  const col2Defaults: NavChild[] = [
    { label: "About", href: "/about" },
    { label: "Journal", href: "/blog" },
    { label: "Events", href: "/events" },
    { label: "Videos", href: "/videos" },
    { label: "Testimonials", href: "/testimonials" },
    { label: "Contact", href: "/contact" },
  ];
  const col2Saved = toFooterLinkRows(col2LinksRaw);
  const col2Fallback: FooterLinkRow[] =
    col2Saved.length > 0 ? col2Saved : col2Defaults;
  const studioLinks = filterNavByFlags(
    resolveFooterNav(business?.siteContent?.footerNavigationItems, col2Fallback),
    isEnabled,
  ) as FooterLinkRow[];

  // Toggle-authoritative, like the header CTA: appended to the Studio
  // column rather than folded into its fallback array, so it survives even
  // when the owner has saved a custom quick-links list (Admin or the
  // template field). Deduped against BOTH columns in case the owner already
  // links to /donate from either one.
  const showDonateLink =
    isEnabled("donations") &&
    !!business?.donationShowInFooter &&
    ![...shopLinks, ...studioLinks].some((l) => l.href === "/donate");
  const studioLinksFinal: FooterLinkRow[] = showDonateLink
    ? [
        ...studioLinks,
        {
          label: resolveDonationLabel(business?.donationLabel).verb,
          href: "/donate",
        },
      ]
    : studioLinks;

  // Account rows at the foot of Studio (B10.3, PF18), gated on
  // `customerAccounts`. Signed in: "My account" (settings) and "Orders"
  // only while `orders` is on, both from the flag-gated account links.
  const accountsEnabled = isEnabled("customerAccounts");
  const accountLinksAll = getAccountNavLinks({ isEnabled });
  const settingsLink = accountLinksAll.find((link) => link.key === "settings");
  const ordersLink = accountLinksAll.find((link) => link.key === "orders");
  const signedInLinks = [
    ...(settingsLink ? [{ label: "My account", href: settingsLink.href }] : []),
    ...(ordersLink ? [{ label: "Orders", href: ordersLink.href }] : []),
  ];

  // A column disappears entirely — heading included — once its resolved
  // list (and, for Studio, the account rows) is empty (PF19).
  const showShopCol = shopLinks.length > 0;
  const showStudioCol = studioLinksFinal.length > 0 || accountsEnabled;
  const linkColCount = Number(showShopCol) + Number(showStudioCol);

  // Gated on `socialLinks.length` alone — an owner with no socials set at all
  // must never see an empty icon row reserving space under the tagline. There is
  // no separate hide toggle: the icons are part of the `global.footer` section,
  // and emptying the list in Content → Branding is what removes them.
  const showSocial = socialLinks.length > 0;

  const ownerLegalLinks = parseTemplateListRows(
    customFields?.["pink.global.footer-legal-links"],
  ) as { _id?: string; label?: string; url?: string }[];
  // Merge the auto-resolved policy pages ahead of the owner's custom list,
  // deduped by url so an owner who's already added their own Privacy Policy /
  // Terms of Service link doesn't get a second copy of it.
  const resolvedUrls = new Set((resolvedLegalLinks ?? []).map((l) => l.url));
  // `_originalIndex` marks a row as a real `footer-legal-links` list row (and
  // carries its position in the SAVED list) — the resolved policy-page links
  // ahead of it aren't part of that list, so they're left without one and get
  // no `data-sp-item`.
  const legalLinks: {
    _id?: string;
    label?: string;
    url?: string;
    _originalIndex?: number;
  }[] = [
    ...(resolvedLegalLinks ?? []),
    ...ownerLegalLinks
      .map((l, i) => ({ ...l, _originalIndex: i }))
      .filter((l) => l.url && !resolvedUrls.has(l.url)),
  ];

  const bg = isLight ? "var(--pink-paper)" : "var(--pink-ink)";
  const fg = isLight ? "var(--pink-ink)" : "var(--pink-paper)";
  const mutedFg = isLight ? "var(--pink-muted)" : "var(--pink-ink-muted)";
  const subtleFg = isLight ? "var(--pink-subtle)" : "var(--pink-ink-subtle)";
  const ruleColor = isLight ? "var(--pink-line)" : "var(--pink-ink-line)";
  const accent = isLight ? "var(--pink-rose)" : "var(--pink-blush)";
  const labelClass = isLight ? "pink-label" : "pink-label-dark";

  return (
    <footer style={{ background: bg, color: fg }}>
      <div
        className="mx-auto grid max-w-[1480px] gap-8 px-5 py-16 md:px-10"
        // Three columns since the social block moved under the tagline
        // (2026-08-05). The link columns are `1fr` rather than the `auto` they
        // were as a four-column footer: with `auto` they shrink to their text
        // and the whole pair clings to the right edge, leaving ~800px of dead
        // centre at 1440px — the fourth column used to fill that. Fractional
        // widths spread them back across the right half. Track count follows
        // `linkColCount` (PF19) so a column hidden by an empty resolved list
        // doesn't leave a dead track behind it.
        style={{
          gridTemplateColumns:
            linkColCount === 2
              ? "minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)"
              : linkColCount === 1
                ? "minmax(0,1.3fr) minmax(0,1fr)"
                : "minmax(0,1.3fr)",
        }}
      >
        {/* ── Col 1: wordmark + tagline + socials (global.footer) ── */}
        <div
          className="col-span-full flex flex-col gap-4 md:col-span-1"
          {...sectionGroupAttr("global", "footer")}
        >
          {useWordmarkSvg ? (
            <PinkWordmarkSvg
              className="pink-footer-wordmark-svg"
              accentColor={accent}
              inkColor={fg}
              label={businessName}
            />
          ) : brandLogoUrl ? (
            <Image
              src={brandLogoUrl}
              alt={logoAlt}
              width={220}
              height={56}
              // Height-capped rather than width-capped: an owner's logo can be
              // any ratio, and the column has to stay a fixed rhythm above the
              // tagline. `object-contain` so a wide mark letterboxes instead of
              // cropping — the browser applies an `aspect-ratio` from the
              // `width`/`height` attributes above, so a logo whose real aspect
              // ratio is narrower than 220:56 DOES letterbox even though no
              // wrapper box is visible; `object-left` (PF20) anchors that
              // letterboxed image to the same left edge as the social icons
              // below it instead of the `object-contain` default of centering
              // it, which read as ~80px of dead space left of the mark.
              className="h-10 w-auto max-w-[220px] object-contain object-left"
            />
          ) : (
            <span
              className="pink-display"
              style={{ fontSize: "26px", fontWeight: 700, color: fg }}
            >
              {wordmark.matches ? (
                <>
                  {wordmark.prefix}
                  <span style={{ color: accent }}>{wordmark.tail}</span>
                </>
              ) : (
                businessName
              )}
            </span>
          )}

          {/* No `fieldAttr`: the tagline is edited in Content → Branding, not
              a template field, so a click lands on the `global.footer`
              section (the wrapper's `sectionGroupAttr`) — same as noise. */}
          {footerTagline && (
            <p
              className="max-w-[32ch] text-[15px] leading-[1.75]"
              style={{ color: mutedFg }}
            >
              {footerTagline}
            </p>
          )}

          {/* Socials sit under the tagline rather than in a column of their own.
              Tone must follow the footer's own resolved tone, not a literal:
              `/about` and `/blog/[slug]` render the LIGHT footer, where the
              dark ramp's resting icon colour (`--pink-ink-body`, #e8e8e8)
              lands at ~1.2:1 on white — invisible. Same class of defect as the
              /collections regression in the 2026-07-31 remediation. */}
          {showSocial && (
            <PinkSocialLinks
              socialLinks={business?.siteContent?.socialLinks}
              tone={resolvedTone}
            />
          )}
        </div>

        {/* ── Col 2 + 3: link columns (global.footer) — each hides on its
            own (heading included) once its resolved list is empty, PF19 ── */}
        <div
          className={cn(
            "col-span-full grid gap-8 sm:col-span-2 sm:contents",
            linkColCount >= 2 ? "grid-cols-2" : "grid-cols-1",
          )}
          {...sectionGroupAttr("global", "footer")}
        >
          {showShopCol && (
            <FooterCol
              title={col1Title}
              links={shopLinks}
              labelClass={labelClass}
              fg={fg}
              fieldKey="pink.global.footer-col1-links"
            />
          )}
          {showStudioCol && (
            <FooterCol
              title={col2Title}
              links={studioLinksFinal}
              labelClass={labelClass}
              fg={fg}
              fieldKey="pink.global.footer-col2-links"
              extra={
                accountsEnabled ? (
                  <PinkFooterAccount
                    initialSession={initialSession}
                    signedInLinks={signedInLinks}
                    fg={fg}
                  />
                ) : null
              }
            />
          )}
        </div>
      </div>

      {/* ── Legal strip (global.footer) — mandatory, non-hideable (B10.1,
          PF17): exactly the four standard policy links `resolvedLegalLinks`
          resolves (privacy/terms with platform fallbacks, shipping/returns
          only once published, platform policies index last), plus whatever
          extra links the owner has explicitly added via
          `pink.global.footer-legal-links` — never any other policy-type
          page. Always non-empty, so it always renders. ── */}
      <div
        className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-5 py-5 md:px-10"
        style={{ borderTop: `1px solid ${ruleColor}`, color: subtleFg }}
        {...sectionGroupAttr("global", "footer")}
      >
        <p className="text-[14px]">
          &copy; {new Date().getFullYear()} {businessName}
        </p>
        {legalLinks.length > 0 && (
          <nav
            aria-label="Policies"
            className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]"
          >
            {legalLinks.map((l) =>
              l.url ? (
                <Link
                  key={l._id ?? l.label}
                  href={l.url}
                  className="transition-colors"
                  {...(l._originalIndex !== undefined
                    ? listItemAttr(
                        "pink.global.footer-legal-links",
                        l._originalIndex,
                      )
                    : {})}
                >
                  {l.label ?? "Link"}
                </Link>
              ) : null,
            )}
          </nav>
        )}
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  labelClass,
  fg,
  fieldKey,
  extra,
}: {
  title: string;
  links: FooterLinkRow[];
  labelClass: string;
  fg: string;
  /** `pink.global.footer-col1-links` / `footer-col2-links` — for `data-sp-item`. */
  fieldKey: string;
  /** Extra `<li>` rows after the links (Studio's account rows, B10.3). */
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[11px]">
      <h2 className={labelClass}>{title}</h2>
      <ul className="flex flex-col gap-[11px]">
        {links
          .filter((l) => l.href)
          .map((l) => (
            <li
              key={l.href + l.label}
              {...(l.itemIndex !== undefined
                ? listItemAttr(fieldKey, l.itemIndex)
                : {})}
            >
              <Link
                href={l.href}
                {...externalLinkProps(l.external)}
                className="text-[15px] whitespace-nowrap transition-colors"
                style={{ color: fg }}
              >
                {l.label}
                {l.external && (
                  <span className="sr-only"> (opens in new tab)</span>
                )}
              </Link>
            </li>
          ))}
        {extra}
      </ul>
    </div>
  );
}
