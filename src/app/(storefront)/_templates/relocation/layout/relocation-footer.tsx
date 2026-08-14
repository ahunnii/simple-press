import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { getListFieldValue } from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { DEFAULT_RELOCATION_SERVICES } from "../homepage";
import { toRelocationIconRows } from "../homepage/rows";
import { relocationTelHref } from "../shared/relocation-phone";

/**
 * Charcoal footer (design.md → Chrome): four columns — About Us blurb ·
 * Our Services · Areas We Serve + Helpful Links · CONTACT US — over a new
 * bottom bar carrying the social icons and the copyright line.
 *
 * Layout, column headings (terracotta-red) and the 0.9375rem omnes-pro body
 * copy are still transcribed 1:1 from the clone footer (page.tsx n563–n649),
 * quirks included ("Rights &  Responsibilities" with the double space). What
 * the columns SAY, however, lives in template fields and platform settings.
 * Sources of truth:
 *
 * - About blurb → a template field (`relocation.global.footer.about-blurb`).
 *   The whole column, heading included, is hidden when it's blank — no orphan
 *   heading.
 * - Services → the homepage "Services" list field, parsed with the same
 *   helper + fallback rows the homepage and `/services` use, so the three can
 *   never drift apart (titles only here).
 * - Helpful Links → the field-driven labels plus the store's published policy
 *   pages, falling back to the platform policies when the owner hasn't
 *   written their own (`default-footer.tsx` convention).
 * - Contact → Settings → General (name, address, phone, support email) and
 *   Settings → Hours (`formatBusinessHours`). Every line is guarded
 *   individually, and `tel:` / `mailto:` are never emitted with an empty
 *   target.
 * - Social icons → Content → Branding (`SiteContent.socialLinks`), via the
 *   shared registry; the row disappears when none are set.
 *
 * Async because of the policy-pages query — the storefront layout that
 * renders this footer is already a server component (`relocation-layout.tsx`).
 *
 * The clone's two source bugs stay fixed: the phone link pointed at
 * `tel:+17373674294` while displaying (313)-649-4917 (one number, from
 * Settings → General, now feeds both), and the display number was split
 * across two nodes.
 */
export async function RelocationFooter({
  business,
}: DefaultFooterTemplateProps) {
  const customFields = business?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "relocation.global.footer.about-heading",
    "relocation.global.footer.about-blurb",
    "relocation.global.footer.services-heading",
    "relocation.global.footer.areas-heading",
    "relocation.global.footer.areas-served",
    "relocation.global.footer.links-heading",
    "relocation.global.footer.rights-label",
    "relocation.global.footer.checklist-label",
    "relocation.global.footer.checklist-url",
    "relocation.global.footer.contact-heading",
  ]);

  const aboutBlurb = f["relocation.global.footer.about-blurb"] ?? "";
  const areasServed = f["relocation.global.footer.areas-served"] ?? "";
  const rightsLabel = f["relocation.global.footer.rights-label"] ?? "";
  const checklistLabel = f["relocation.global.footer.checklist-label"] ?? "";
  const checklistUrl = f["relocation.global.footer.checklist-url"] ?? "";

  // Same read the homepage section and `/services` perform — literal key
  // (the field is defined in the homepage module), shared parser, shared
  // fallback rows. Only the titles are used here.
  const services = toRelocationIconRows(
    getListFieldValue(customFields, "relocation.homepage.services-list"),
    DEFAULT_RELOCATION_SERVICES,
  )
    .map((row) => row.title)
    .filter((title) => title !== "");

  // Store policy pages first, then a platform fallback for whichever of
  // privacy-policy / terms-of-service the owner hasn't published — so those
  // two links always resolve somewhere (`default-footer.tsx:268–298`).
  const policyPages = await api.content.getSimplifiedPages({ type: "policy" });
  const hasPrivacyPolicy = policyPages.some((p) => p.slug === "privacy-policy");
  const hasTermsOfService = policyPages.some(
    (p) => p.slug === "terms-of-service",
  );
  const policyLinks = [
    ...policyPages.map((page) => ({
      key: page.id,
      href: `/${page.slug}`,
      label: page.title,
    })),
    ...(hasPrivacyPolicy
      ? []
      : [
          {
            key: "platform-privacy-policy",
            href: "/platform/policies/privacy-policy",
            label: "Privacy Policy",
          },
        ]),
    ...(hasTermsOfService
      ? []
      : [
          {
            key: "platform-terms-of-service",
            href: "/platform/policies/terms-of-service",
            label: "Terms of Service",
          },
        ]),
  ];

  const businessName = business?.name ?? "";
  const address = business?.businessAddress ?? "";
  const phone = business?.phoneNumber ?? "";
  const phoneHref = relocationTelHref(phone);
  const email = business?.supportEmail ?? "";
  const hoursRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );

  const socialLinks = resolveSocialLinks(business?.siteContent?.socialLinks);

  return (
    <footer
      {...sectionGroupAttr("global", "footer")}
      role="contentinfo"
      className="w-full bg-[var(--relocation-charcoal)] text-[var(--relocation-paper)]"
    >
      <div className="mx-auto grid w-full max-w-[85rem] grid-cols-1 gap-x-10 gap-y-12 px-6 py-16 min-[572px]:grid-cols-2 min-[572px]:px-10 min-[1025px]:grid-cols-4 min-[1025px]:px-16 min-[1025px]:py-20">
        {/* ── About Us (template field; hidden wholesale when unset) ────── */}
        {aboutBlurb !== "" ? (
          <section aria-labelledby="relocation-footer-about">
            <FooterHeading
              id="relocation-footer-about"
              fieldKey="relocation.global.footer.about-heading"
            >
              {f["relocation.global.footer.about-heading"] ?? ""}
            </FooterHeading>
            <p
              {...fieldAttr("relocation.global.footer.about-blurb")}
              className="relocation-footer-body"
            >
              {aboutBlurb}
            </p>
          </section>
        ) : null}

        {/* ── Our Services (mirrors the homepage services list) ──────────── */}
        <section aria-labelledby="relocation-footer-services">
          <FooterHeading
            id="relocation-footer-services"
            fieldKey="relocation.global.footer.services-heading"
          >
            {f["relocation.global.footer.services-heading"] ?? ""}
          </FooterHeading>
          {services.length > 0 ? (
            <ul className="relocation-footer-list">
              {services.map((title, i) => (
                <li key={`${title}-${i}`} className="relocation-footer-body">
                  {title}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* ── Areas We Serve + Helpful Links ─────────────────────────────── */}
        <div className="flex flex-col gap-10">
          <section aria-labelledby="relocation-footer-areas">
            <FooterHeading
              id="relocation-footer-areas"
              fieldKey="relocation.global.footer.areas-heading"
            >
              {f["relocation.global.footer.areas-heading"] ?? ""}
            </FooterHeading>
            {areasServed ? (
              <ul className="relocation-footer-list">
                <li className="relocation-footer-body">{areasServed}</li>
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="relocation-footer-links">
            <FooterHeading
              id="relocation-footer-links"
              fieldKey="relocation.global.footer.links-heading"
            >
              {f["relocation.global.footer.links-heading"] ?? ""}
            </FooterHeading>
            <ul className="relocation-footer-list">
              {rightsLabel ? (
                <li className="relocation-footer-body">{rightsLabel}</li>
              ) : null}
              {checklistLabel && checklistUrl ? (
                <li className="relocation-footer-body">
                  <a
                    href={checklistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relocation-hover-fade underline"
                  >
                    {checklistLabel}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </li>
              ) : null}
              {policyLinks.map((link) => (
                <li key={link.key} className="relocation-footer-body">
                  <Link
                    href={link.href}
                    className="relocation-hover-fade underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── Contact us (Settings → General + Settings → Hours) ─────────── */}
        <section aria-labelledby="relocation-footer-contact">
          <FooterHeading
            id="relocation-footer-contact"
            fieldKey="relocation.global.footer.contact-heading"
          >
            {f["relocation.global.footer.contact-heading"] ?? ""}
          </FooterHeading>
          <address className="flex flex-col gap-4 not-italic">
            {businessName !== "" ? (
              <span className="[font-family:var(--font-relocation-display)] text-[1.1875rem] leading-7">
                {businessName}
              </span>
            ) : null}
            {address !== "" ? (
              <span className="relocation-footer-body">{address}</span>
            ) : null}
            {phoneHref !== "" ? (
              <a
                href={phoneHref}
                className="relocation-hover-fade relocation-footer-body underline"
              >
                {phone}
              </a>
            ) : null}
            {email !== "" ? (
              <a
                href={`mailto:${email}`}
                className="relocation-hover-fade relocation-footer-body underline"
              >
                {email}
              </a>
            ) : null}
            {hoursRows.length > 0 ? (
              <dl className="flex flex-col gap-1.5">
                {hoursRows.map((row, i) => (
                  <div
                    key={`${row.label}-${i}`}
                    className="relocation-footer-body flex flex-wrap items-baseline gap-x-2"
                  >
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </address>
        </section>
      </div>

      {/* ── Bottom bar: socials (Content → Branding) + copyright ─────────── */}
      <div className="border-t border-[var(--relocation-paper)]/15">
        <div className="mx-auto flex w-full max-w-[85rem] flex-col items-center gap-5 px-6 py-8 min-[572px]:flex-row min-[572px]:justify-between min-[572px]:px-10 min-[1025px]:px-16">
          {socialLinks.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-5">
              {socialLinks.map(({ key, url, ariaLabel, Icon }) => (
                <li key={key}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relocation-hover-fade flex h-6 w-6 items-center justify-center [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">
                      {ariaLabel} (opens in new tab)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="relocation-footer-body">
            &copy; {new Date().getFullYear()} {businessName}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({
  children,
  id,
  fieldKey,
}: {
  children: React.ReactNode;
  id: string;
  fieldKey: string;
}) {
  return (
    <h2
      id={id}
      {...fieldAttr(fieldKey)}
      className="mb-5 [font-family:var(--font-relocation-display)] text-[1.1875rem] leading-7 font-bold text-[var(--relocation-red-on-dark)]"
    >
      {children}
    </h2>
  );
}
