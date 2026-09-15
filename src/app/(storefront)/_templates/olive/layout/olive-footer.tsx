import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { OliveNavCollection } from "./olive-nav-overlay";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { PinterestIcon } from "~/components/icons/pinterest-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

import { resolveFields } from "..";
import { OliveLeafMark } from "../shared/olive-leaf-mark";

type FooterLink = { href: string; label: string };

type SocialLink = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type OliveFooterProps = DefaultFooterTemplateProps & {
  /** Published collections, resolved once by the layout. */
  collections?: OliveNavCollection[];
};

/** How many collections the Shop column will list before it stops. */
const MAX_COLLECTION_LINKS = 5;
/** How many policy pages the Help column will list before it stops. */
const MAX_POLICY_LINKS = 4;

/**
 * The book cover. A sage field carrying the call-to-action card and three
 * dense link columns, then a deep leaf strip where the wordmark is set huge
 * and clipped by the page edge like the print on a shopping bag.
 *
 * Density courage on purpose: the link columns are tight (0.8125rem, 0.5rem
 * row gap), not airy — this is the index of the book, not another section.
 */
export async function OliveFooter({
  business,
  collections = [],
}: OliveFooterProps) {
  const { isEnabled } = await getBusinessFlags();

  // Policy pages are the owner's own; fall back to the platform's when a store
  // has not written any yet, so the Help column is never a dead stub.
  const policies = await api.content
    .getSimplifiedPages({ type: "policy" })
    .catch(() => [] as { id: string; title: string; slug: string }[]);

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.global.footer-tagline",
    "olive.global.footer-cta-heading",
    "olive.global.footer-cta-body",
    "olive.global.footer-cta-label",
    "olive.global.footer-cta-link",
    "olive.global.wordmark-tagline",
    "olive.global.social-instagram",
    "olive.global.social-tiktok",
    "olive.global.social-facebook",
    "olive.global.social-pinterest",
  ]);

  const footerTagline = f["olive.global.footer-tagline"] ?? "";
  const ctaHeading = f["olive.global.footer-cta-heading"] ?? "";
  const ctaBody = f["olive.global.footer-cta-body"] ?? "";
  const ctaLabel = f["olive.global.footer-cta-label"] ?? "";
  const ctaLink = (f["olive.global.footer-cta-link"] ?? "").trim();
  const wordmarkTagline = f["olive.global.wordmark-tagline"] ?? "";

  const name = business?.name ?? "";
  const year = new Date().getFullYear();

  const productsEnabled = isEnabled("products");
  const collectionsEnabled = isEnabled("collections");
  const blogEnabled = isEnabled("blog");
  const testimonialsEnabled = isEnabled("testimonials");
  const accountsEnabled = isEnabled("customerAccounts");

  const listedCollections = collectionsEnabled
    ? collections.slice(0, MAX_COLLECTION_LINKS)
    : [];

  const shopLinks: FooterLink[] =
    listedCollections.length > 0
      ? [
          ...listedCollections.map((collection) => ({
            href: `/collections/${collection.slug}`,
            label: collection.name,
          })),
          ...(productsEnabled
            ? [{ href: "/shop", label: "All products" }]
            : []),
          ...(collectionsEnabled
            ? [{ href: "/collections", label: "All collections" }]
            : []),
        ]
      : [
          ...(productsEnabled
            ? [
                { href: "/shop", label: "All products" },
                { href: "/shop", label: "New arrivals" },
              ]
            : []),
          ...(collectionsEnabled
            ? [{ href: "/collections", label: "Collections" }]
            : []),
        ];

  const policyLinks: FooterLink[] =
    policies.length > 0
      ? policies
          .slice(0, MAX_POLICY_LINKS)
          .map((page) => ({ href: `/${page.slug}`, label: page.title }))
      : [
          {
            href: "/platform/policies/terms-of-service",
            label: "Terms of service",
          },
          {
            href: "/platform/policies/privacy-policy",
            label: "Privacy policy",
          },
        ];

  const helpLinks: FooterLink[] = [
    ...policyLinks,
    { href: "/contact", label: "Contact" },
  ];

  const aboutLinks: FooterLink[] = [
    { href: "/about", label: "About" },
    ...(blogEnabled ? [{ href: "/blog", label: "Journal" }] : []),
    ...(testimonialsEnabled
      ? [{ href: "/testimonials", label: "Testimonials" }]
      : []),
    ...(accountsEnabled ? [{ href: "/account/orders", label: "Account" }] : []),
  ];

  const socials: SocialLink[] = [
    {
      href: (f["olive.global.social-instagram"] ?? "").trim(),
      label: "Instagram",
      Icon: InstagramIcon,
    },
    {
      href: (f["olive.global.social-tiktok"] ?? "").trim(),
      label: "TikTok",
      Icon: TikTokIcon,
    },
    {
      href: (f["olive.global.social-facebook"] ?? "").trim(),
      label: "Facebook",
      Icon: FacebookIcon,
    },
    {
      href: (f["olive.global.social-pinterest"] ?? "").trim(),
      label: "Pinterest",
      Icon: PinterestIcon,
    },
  ].filter((social) => social.href.length > 0);

  const ctaIsExternal = /^https?:\/\//i.test(ctaLink);
  const showCta = ctaLink.length > 0 && ctaLabel.length > 0;

  return (
    <footer {...sectionGroupAttr("global", "branding")}>
      {/* ── The cover: sage field ─────────────────────────────────────── */}
      <div className="olive-footer-field">
        <div
          className="mx-auto grid gap-10 px-[var(--olive-section-pad-x)] py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:py-16"
          style={{ maxWidth: "var(--olive-container)" }}
        >
          {showCta ? (
            <div className="olive-card max-w-md p-7 sm:p-8">
              <h2
                className="olive-h3"
                {...fieldAttr("olive.global.footer-cta-heading")}
              >
                {ctaHeading}
              </h2>
              {ctaBody ? (
                <p
                  className="mt-2 text-[0.9375rem] leading-relaxed"
                  style={{ color: "var(--olive-ink-soft)" }}
                  {...fieldAttr("olive.global.footer-cta-body")}
                >
                  {ctaBody}
                </p>
              ) : null}
              {ctaIsExternal ? (
                <a
                  href={ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="olive-btn olive-btn-primary mt-6"
                >
                  <span {...fieldAttr("olive.global.footer-cta-label")}>
                    {ctaLabel}
                  </span>
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              ) : (
                <Link
                  href={ctaLink}
                  className="olive-btn olive-btn-primary mt-6"
                  {...fieldAttr("olive.global.footer-cta-label")}
                >
                  {ctaLabel}
                </Link>
              )}
            </div>
          ) : footerTagline ? (
            <p
              className="max-w-[34ch] text-[1.0625rem] leading-relaxed"
              style={{ color: "var(--olive-white)" }}
              {...fieldAttr("olive.global.footer-tagline")}
            >
              {footerTagline}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3">
            <OliveFooterColumn title="Shop" links={shopLinks} />
            <OliveFooterColumn title="Help" links={helpLinks} />
            <OliveFooterColumn title="About" links={aboutLinks} />
          </div>
        </div>
      </div>

      {/* ── The spine: deep leaf strip with the clipped wordmark ──────── */}
      <div className="olive-footer-strip">
        <div
          className="mx-auto flex flex-col gap-5 px-[var(--olive-section-pad-x)] pt-9 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
          style={{ maxWidth: "var(--olive-container)" }}
        >
          <div className="flex items-center gap-2.5">
            <OliveLeafMark size={20} />
            {wordmarkTagline ? (
              <span
                className="text-[0.6875rem] tracking-[0.14em] uppercase"
                {...fieldAttr("olive.global.wordmark-tagline")}
              >
                {wordmarkTagline}
              </span>
            ) : null}
          </div>

          {socials.length > 0 ? (
            <ul className="m-0 flex list-none items-center gap-1 p-0">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (opens in new tab)`}
                    className="olive-icon-btn olive-icon-btn-invert"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <p
            className="text-[0.6875rem] tracking-[0.06em]"
            style={{ color: "var(--olive-sage-tint)" }}
          >
            © {year} {name}
          </p>
        </div>

        {/* The wordmark as the bag's own print: huge, tracked, cut by the
            page edge. Decorative — the name is already in the copyright. */}
        <span aria-hidden="true" className="olive-footer-watermark mt-7">
          {name}
        </span>
      </div>
    </footer>
  );
}

function OliveFooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  if (links.length === 0) return null;
  return (
    <div>
      <h2 className="olive-footer-col-title">{title}</h2>
      <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="olive-footer-link">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
