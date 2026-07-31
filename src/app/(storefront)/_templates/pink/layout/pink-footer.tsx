"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DefaultFooterTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { resolveFields } from "..";

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
  "pink.global.locality-tag",
  "pink.global.footer-blurb",
  "pink.global.footer-col1-title",
  "pink.global.footer-col2-title",
  "pink.global.footer-cta-heading",
  "pink.global.footer-cta-body",
  "pink.global.footer-cta-button",
  "pink.global.footer-cta-link",
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
  const localityTag = f["pink.global.locality-tag"] ?? "";
  const wordmark = splitAccentWordmark(businessName, accentWord);
  const footerBlurb = f["pink.global.footer-blurb"] ?? "";

  const socialLinks = parseTemplateListRows(customFields?.["pink.global.social-links"]) as {
    _id?: string;
    label?: string;
    url?: string;
  }[];

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
          ...(isEnabled("testimonials") ? [{ label: "Keepers", url: "/testimonials" }] : []),
          { label: "Contact", url: "/contact" },
        ];

  const ctaHeading = (f["pink.global.footer-cta-heading"] ?? "").trim();
  const ctaBody = (f["pink.global.footer-cta-body"] ?? "").trim();
  const ctaButtonText = (f["pink.global.footer-cta-button"] ?? "").trim();
  const ctaLink = f["pink.global.footer-cta-link"] ?? "/contact";
  const showCta =
    isSectionVisible(rawCustomFields, "pink", "global.footer-cta") && ctaHeading.length > 0;

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
  const boxBorder = isLight ? "var(--pink-line-button)" : "var(--pink-ink-line-strong)";
  const labelClass = isLight ? "pink-label" : "pink-label-dark";

  return (
    <footer style={{ background: bg, color: fg }}>
      <div
        className="mx-auto grid max-w-[1400px] gap-8 px-5 py-16 md:px-10"
        style={{
          gridTemplateColumns: showCta
            ? "minmax(0,1.3fr) auto auto minmax(0,1fr)"
            : "minmax(0,1.3fr) auto auto",
        }}
      >
        {/* ── Col 1: wordmark + blurb + socials (global.branding) ── */}
        <div
          className="col-span-full flex flex-col gap-4 md:col-span-1"
          {...sectionGroupAttr("global", "branding")}
        >
          <div className="flex items-baseline gap-2.5">
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
            {localityTag && (
              <span
                className="text-[11px] font-medium tracking-[0.2em] uppercase"
                style={{ color: subtleFg }}
                {...fieldAttr("pink.global.locality-tag")}
              >
                {localityTag}
              </span>
            )}
          </div>

          {footerBlurb && (
            <p
              className="max-w-[32ch] text-[15px] leading-[1.75]"
              style={{ color: mutedFg }}
              {...fieldAttr("pink.global.footer-blurb")}
            >
              {footerBlurb}
            </p>
          )}

          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map((s) =>
                s.url ? (
                  <a
                    key={s._id ?? s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] transition-colors"
                    style={{ border: `1px solid ${boxBorder}`, padding: "10px 16px", color: fg }}
                  >
                    {s.label ?? "Link"}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                ) : null,
              )}
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

        {/* ── Col 4: CTA block (global.footer-cta) ── */}
        {showCta && (
          <div
            className="col-span-full flex flex-col gap-4 md:col-span-1"
            {...sectionGroupAttr("global", "footer-cta")}
          >
            <h2
              className="pink-display"
              style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.015em", color: fg }}
              {...fieldAttr("pink.global.footer-cta-heading")}
            >
              {ctaHeading}
            </h2>
            {ctaBody && (
              <p
                className="text-[14px] leading-[1.6]"
                style={{ color: mutedFg }}
                {...fieldAttr("pink.global.footer-cta-body")}
              >
                {ctaBody}
              </p>
            )}
            {ctaButtonText && (
              <Link
                href={ctaLink}
                className="pink-btn pink-btn-solid w-fit"
                {...fieldAttr("pink.global.footer-cta-button")}
              >
                {ctaButtonText}
              </Link>
            )}
          </div>
        )}
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
