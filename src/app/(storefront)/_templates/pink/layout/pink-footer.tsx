"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DefaultFooterTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { resolveFields } from "..";
import { PinkSocialLinks } from "../shared/pink-social-links";
import { PinkWordmarkSvg } from "../shared/pink-wordmark-svg";

type PinkFooterProps = DefaultFooterTemplateProps & {
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
  "pink.global.footer-blurb",
  "pink.global.footer-col1-title",
  "pink.global.footer-col2-title",
  "pink.global.footer-copyright",
];

function isLightFooterRoute(pathname: string): boolean {
  return pathname === "/about" || /^\/blog\/[^/]+\/?$/.test(pathname);
}

/** Mirrors the split used in `pink-header.tsx` — see that file for details. */
function splitAccentWordmark(name: string, accentWord: string) {
  const trimmedAccent = accentWord.trim();
  if (!trimmedAccent || !name.toLowerCase().endsWith(trimmedAccent.toLowerCase())) {
    return { matches: false as const };
  }
  const splitIndex = name.length - trimmedAccent.length;
  return {
    matches: true as const,
    prefix: name.slice(0, splitIndex),
    tail: name.slice(splitIndex),
  };
}

export function PinkFooter({ business, tone, resolvedLegalLinks }: PinkFooterProps) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const resolvedTone: "dark" | "light" =
    tone ?? (isLightFooterRoute(pathname ?? "") ? "light" : "dark");
  const isLight = resolvedTone === "light";

  const businessName = business?.name ?? "PinkArt";
  const rawCustomFields = business?.siteContent?.customFields;
  const customFields = rawCustomFields as Record<string, unknown> | undefined;
  const f = resolveFields(rawCustomFields, FIELD_KEYS);

  const accentWord = f["pink.global.accent-word"] ?? "";
  const wordmark = splitAccentWordmark(businessName, accentWord);
  const footerBlurb = f["pink.global.footer-blurb"] ?? "";

  // ── What the footer shows as the brand ──
  // Three-way owner choice, expressed with the two field types the platform
  // already has (there is no select/enum type): a switch picks the traced
  // mark, and everything below it is a fallback chain. Precedence:
  //
  //   1. the traced PINKART mark          — switch on (the default)
  //   2. `pink.global.footer-logo`        — a footer-specific upload
  //   3. `siteContent.logoUrl`            — whatever the header already uses
  //   4. the live-text wordmark           — always available, never blank
  //
  // Steps 2 and 3 are separate on purpose: the footer is dark on most routes,
  // so a header logo drawn in dark ink disappears there. The dedicated field
  // is where an owner puts the light version, and it wins when set.
  const useWordmarkSvg =
    (f["pink.global.footer-brand-mark"] ?? "true") === "true";
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

  const col1Links =
    col1LinksRaw.length > 0
      ? col1LinksRaw
      : [
          { label: "Shop all", url: "/shop" },
          ...(isEnabled("collections") ? [{ label: "Collections", url: "/collections" }] : []),
          ...(isEnabled("services") ? [{ label: "Make & takes", url: "/services" }] : []),
        ];
  const col2Links =
    col2LinksRaw.length > 0
      ? col2LinksRaw
      : [
          { label: "The artist", url: "/about" },
          ...(isEnabled("blog") ? [{ label: "Journal", url: "/blog" }] : []),
          ...(isEnabled("events") ? [{ label: "Events", url: "/events" }] : []),
          ...(isEnabled("videos") ? [{ label: "Videos", url: "/videos" }] : []),
          ...(isEnabled("testimonials") ? [{ label: "Testimonials", url: "/testimonials" }] : []),
          { label: "Contact", url: "/contact" },
        ];

  // Gated on `socialLinks.length` — an owner with no socials set at all must
  // never see an empty icon row reserving space under the blurb.
  const showSocial =
    isSectionVisible(rawCustomFields, "pink", "global.footer-social") &&
    socialLinks.length > 0;

  // No hardcoded location in the fallback — the field's own defaultValue carries
  // PinkArt's, and a different owner on this template must not inherit it.
  const copyrightLine = f["pink.global.footer-copyright"] ?? businessName;
  const ownerLegalLinks = parseTemplateListRows(
    customFields?.["pink.global.footer-legal-links"],
  ) as { _id?: string; label?: string; url?: string }[];
  // Merge the auto-resolved policy pages ahead of the owner's custom list,
  // deduped by url so an owner who's already added their own Privacy Policy /
  // Terms of Service link doesn't get a second copy of it.
  const resolvedUrls = new Set((resolvedLegalLinks ?? []).map((l) => l.url));
  const legalLinks: { _id?: string; label?: string; url?: string }[] = [
    ...(resolvedLegalLinks ?? []),
    ...ownerLegalLinks.filter((l) => l.url && !resolvedUrls.has(l.url)),
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
        className="mx-auto grid max-w-[1400px] gap-8 px-5 py-16 md:px-10"
        // Three columns since the social block moved under the blurb
        // (2026-08-05). The link columns are `1fr` rather than the `auto` they
        // were as a four-column footer: with `auto` they shrink to their text
        // and the whole pair clings to the right edge, leaving ~800px of dead
        // centre at 1440px — the fourth column used to fill that. Fractional
        // widths spread them back across the right half.
        style={{
          gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)",
        }}
      >
        {/* ── Col 1: wordmark + blurb + socials (global.branding) ── */}
        <div
          className="col-span-full flex flex-col gap-4 md:col-span-1"
          {...sectionGroupAttr("global", "branding")}
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
              alt={businessName}
              width={220}
              height={56}
              // Height-capped rather than width-capped: an owner's logo can be
              // any ratio, and the column has to stay a fixed rhythm above the
              // blurb. `object-contain` so a wide mark letterboxes instead of
              // cropping.
              className="h-10 w-auto max-w-[220px] object-contain"
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

          {footerBlurb && (
            <p
              className="max-w-[32ch] text-[15px] leading-[1.75]"
              style={{ color: mutedFg }}
              {...fieldAttr("pink.global.footer-blurb")}
            >
              {footerBlurb}
            </p>
          )}

          {/* Socials, formerly their own "Follow along" column — folded under
              the blurb 2026-08-05 per the redesign. Tone must follow the
              footer's own resolved tone, not a literal: `/about` and
              `/blog/[slug]` render the LIGHT footer, where the dark ramp's
              resting icon colour (`--pink-ink-body`, #e8e8e8) lands at
              ~1.2:1 on white — invisible. Same class of defect as the
              /collections regression in the 2026-07-31 remediation. */}
          {showSocial && (
            <div {...sectionGroupAttr("global", "footer-social")}>
              <PinkSocialLinks
                socialLinks={business?.siteContent?.socialLinks}
                tone={resolvedTone}
              />
            </div>
          )}
        </div>

        {/* ── Col 2 + 3: link columns (global.footer-links) ── */}
        <div
          className="col-span-full grid grid-cols-2 gap-8 sm:col-span-2 sm:contents"
          {...sectionGroupAttr("global", "footer-links")}
        >
          <FooterCol title={col1Title} links={col1Links} labelClass={labelClass} fg={fg} />
          <FooterCol title={col2Title} links={col2Links} labelClass={labelClass} fg={fg} />
        </div>
      </div>

      {/* ── Legal strip (global.footer-legal) ── */}
      <div
        className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-5 md:px-10"
        style={{ borderTop: `1px solid ${ruleColor}`, color: subtleFg }}
        {...sectionGroupAttr("global", "footer-legal")}
      >
        <p className="text-[14px]">
          <span>{new Date().getFullYear()} </span>
          <span {...fieldAttr("pink.global.footer-copyright")}>{copyrightLine}</span>
        </p>
        {legalLinks.length > 0 && (
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            {legalLinks.map((l) =>
              l.url ? (
                <Link key={l._id ?? l.label} href={l.url} className="transition-colors">
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
}: {
  title: string;
  links: { _id?: string; label?: string; url?: string }[];
  labelClass: string;
  fg: string;
}) {
  return (
    <div className="flex flex-col gap-[11px]">
      <h2 className={labelClass}>{title}</h2>
      <ul className="flex flex-col gap-[11px]">
        {links.map((l) =>
          l.url ? (
            <li key={l._id ?? l.label}>
              <Link
                href={l.url}
                className="text-[15px] whitespace-nowrap transition-colors"
                style={{ color: fg }}
              >
                {l.label ?? "Link"}
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
