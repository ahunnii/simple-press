import type { DefaultFooterTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";

/**
 * Charcoal footer (design.md → Chrome): four columns — About Us blurb ·
 * Our Services (5 bullets) · Areas We Serve + Helpful Links · CONTACT US.
 * Column headings are terracotta-red, body copy white omnes-pro at the
 * clone's 0.9375rem/0.9375rem.
 *
 * Copy is transcribed 1:1 from the clone footer (page.tsx n563–n649),
 * including its quirks ("Rights &  Responsibilities" with the double space,
 * "Detroit,MI"). The two source bugs design.md authorised fixing are fixed:
 * the phone link pointed at `tel:+17373674294` while displaying
 * (313)-649-4917, and the display number was split across two nodes.
 */

const SERVICE_KEYS = [
  "relocation.global.footer.service-1",
  "relocation.global.footer.service-2",
  "relocation.global.footer.service-3",
  "relocation.global.footer.service-4",
  "relocation.global.footer.service-5",
] as const;

export function RelocationFooter({ business }: DefaultFooterTemplateProps) {
  const customFields = business?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "relocation.global.footer.about-heading",
    "relocation.global.footer.about-blurb",
    "relocation.global.footer.services-heading",
    ...SERVICE_KEYS,
    "relocation.global.footer.areas-heading",
    "relocation.global.footer.areas-served",
    "relocation.global.footer.links-heading",
    "relocation.global.footer.rights-label",
    "relocation.global.footer.checklist-label",
    "relocation.global.footer.checklist-url",
    "relocation.global.footer.contact-heading",
    "relocation.global.footer.contact-name",
    "relocation.global.footer.contact-city",
    "relocation.global.footer.contact-phone-label",
    "relocation.global.footer.contact-phone-href",
    "relocation.global.footer.contact-hours",
  ]);

  const services = SERVICE_KEYS.map((key) => f[key] ?? "").filter(
    (label) => label !== "",
  );
  const areasServed = f["relocation.global.footer.areas-served"] ?? "";
  const rightsLabel = f["relocation.global.footer.rights-label"] ?? "";
  const checklistLabel = f["relocation.global.footer.checklist-label"] ?? "";
  const checklistUrl = f["relocation.global.footer.checklist-url"] ?? "";
  const phoneLabel = f["relocation.global.footer.contact-phone-label"] ?? "";
  const phoneHref = f["relocation.global.footer.contact-phone-href"] ?? "";

  return (
    <footer
      {...sectionGroupAttr("global", "footer")}
      role="contentinfo"
      className="w-full bg-[var(--relocation-charcoal)] text-[var(--relocation-paper)]"
    >
      <div className="mx-auto grid w-full max-w-[85rem] grid-cols-1 gap-x-10 gap-y-12 px-6 py-16 min-[572px]:grid-cols-2 min-[572px]:px-10 min-[1025px]:grid-cols-4 min-[1025px]:px-16 min-[1025px]:py-20">
        {/* ── About Us ───────────────────────────────────────────────────── */}
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
            {f["relocation.global.footer.about-blurb"] ?? ""}
          </p>
        </section>

        {/* ── Our Services ───────────────────────────────────────────────── */}
        <section aria-labelledby="relocation-footer-services">
          <FooterHeading
            id="relocation-footer-services"
            fieldKey="relocation.global.footer.services-heading"
          >
            {f["relocation.global.footer.services-heading"] ?? ""}
          </FooterHeading>
          <ul className="relocation-footer-list">
            {services.map((label) => (
              <li key={label} className="relocation-footer-body">
                {label}
              </li>
            ))}
          </ul>
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
            </ul>
          </section>
        </div>

        {/* ── Contact us ─────────────────────────────────────────────────── */}
        <section aria-labelledby="relocation-footer-contact">
          <FooterHeading
            id="relocation-footer-contact"
            fieldKey="relocation.global.footer.contact-heading"
          >
            {f["relocation.global.footer.contact-heading"] ?? ""}
          </FooterHeading>
          <address className="flex flex-col gap-4 not-italic">
            <span
              {...fieldAttr("relocation.global.footer.contact-name")}
              className="[font-family:var(--font-relocation-display)] text-[1.1875rem] leading-7"
            >
              {f["relocation.global.footer.contact-name"] ?? ""}
            </span>
            <span
              {...fieldAttr("relocation.global.footer.contact-city")}
              className="relocation-footer-body"
            >
              {f["relocation.global.footer.contact-city"] ?? ""}
            </span>
            {phoneLabel && phoneHref ? (
              <a
                href={phoneHref}
                className="relocation-hover-fade relocation-footer-body underline"
              >
                {phoneLabel}
              </a>
            ) : null}
            <span
              {...fieldAttr("relocation.global.footer.contact-hours")}
              className="relocation-footer-body"
            >
              {f["relocation.global.footer.contact-hours"] ?? ""}
            </span>
          </address>
        </section>
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
