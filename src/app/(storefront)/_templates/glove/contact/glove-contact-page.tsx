import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import {
  GloveButton,
  GloveContainer,
  GloveHandIcon,
  GloveMistPanel,
  GloveReveal,
  GloveSection,
} from "../shared";
import { GloveContactForm } from "./glove-contact-form";

const FIELD_KEYS = [
  "glove.contact.faq-heading",
  "glove.contact.faq-body",
  "glove.contact.faq-link-label",
  "glove.contact.page-title",
  "glove.contact.form-heading",
  "glove.contact.submit-label",
  "glove.contact.success-heading",
  "glove.contact.success-body",
  "glove.contact.unavailable-message",
  "glove.contact.details-heading",
];

const SECTION_HEADING =
  "glove-display text-[24px] leading-[1.2] font-medium text-[var(--glove-ink)] md:text-[30px]";

export async function GloveContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const { isEnabled } = await getBusinessFlags();

  const f = resolveFields(customFields, FIELD_KEYS);
  const get = (key: string) => (f[`glove.contact.${key}`] ?? "").trim();

  const formEnabled = isEnabled("contactForm");

  // /faq has no feature flag of its own: it renders whenever a published
  // question exists, so the link follows the same rule (and the section toggle).
  const showFaq =
    faqItems.length > 0 &&
    isSectionVisible(customFields, "glove", "contact.faq");

  // Contact details all come from Settings (Business) — never template fields.
  const email = business.supportEmail?.trim() ?? "";
  const phone = business.phoneNumber?.trim() ?? "";
  const address = business.businessAddress?.trim() ?? "";
  const hasDetails = email !== "" || phone !== "" || address !== "";
  const showDetails =
    hasDetails && isSectionVisible(customFields, "glove", "contact.details");

  const twoColumn = showFaq && formEnabled;
  const nothingToShow = !showFaq && !formEnabled && !showDetails;

  return (
    <>
      <div className="glove-section">
        <GloveContainer>
          {/* H1 lives outside the form section so it exists even with the form switched off. */}
          <h1 className="sr-only" {...fieldAttr("glove.contact.page-title")}>
            {get("page-title")}
          </h1>

          {nothingToShow ? (
            <GloveMistPanel className="mx-auto flex max-w-[560px] flex-col items-center gap-4 px-6 py-12 text-center">
              <GloveHandIcon className="size-14 text-[var(--glove-primary)]" />
              <p
                className="text-[var(--glove-text)]"
                {...fieldAttr("glove.contact.unavailable-message")}
              >
                {get("unavailable-message")}
              </p>
            </GloveMistPanel>
          ) : (
            <div
              className={
                twoColumn
                  ? "grid gap-12 lg:grid-cols-2 lg:gap-0"
                  : "grid max-w-[820px]"
              }
            >
              {showFaq ? (
                <section
                  aria-labelledby="glove-contact-faq"
                  {...sectionGroupAttr("contact", "faq")}
                  className={twoColumn ? "lg:pr-12" : undefined}
                >
                  <GloveReveal threshold={0}>
                    <h2
                      id="glove-contact-faq"
                      className={`${SECTION_HEADING} mb-4`}
                      {...fieldAttr("glove.contact.faq-heading")}
                    >
                      {get("faq-heading")}
                    </h2>
                    {get("faq-body") ? (
                      <p
                        className="glove-body mb-6 max-w-[48ch] text-[16px] leading-[1.7] text-[var(--glove-text)]"
                        {...fieldAttr("glove.contact.faq-body")}
                      >
                        {get("faq-body")}
                      </p>
                    ) : null}
                    {get("faq-link-label") ? (
                      <GloveButton href="/faq" variant="wooOutline">
                        <span {...fieldAttr("glove.contact.faq-link-label")}>
                          {get("faq-link-label")}
                        </span>
                      </GloveButton>
                    ) : null}
                  </GloveReveal>
                </section>
              ) : null}

              {formEnabled ? (
                <section
                  aria-labelledby="glove-contact-form"
                  {...sectionGroupAttr("contact", "form")}
                  className={
                    twoColumn
                      ? "border-[var(--glove-line)] lg:border-l lg:pl-12"
                      : undefined
                  }
                >
                  {/* Never wrapped in a reveal: forms render settled. */}
                  <h2
                    id="glove-contact-form"
                    className={`${SECTION_HEADING} mb-6`}
                    {...fieldAttr("glove.contact.form-heading")}
                  >
                    {get("form-heading")}
                  </h2>
                  <GloveContactForm
                    submitLabel={get("submit-label")}
                    submitLabelFieldKey="glove.contact.submit-label"
                    successHeading={get("success-heading")}
                    successHeadingFieldKey="glove.contact.success-heading"
                    successBody={get("success-body")}
                    successBodyFieldKey="glove.contact.success-body"
                  />
                </section>
              ) : null}
            </div>
          )}
        </GloveContainer>
      </div>

      {showDetails ? (
        <GloveSection
          tone="mist"
          aria-label="Contact details"
          sectionAttrs={sectionGroupAttr("contact", "details")}
        >
          {get("details-heading") ? (
            <h2
              className="glove-display mb-8 text-[22px] leading-[1.25] font-medium text-[var(--glove-ink)] md:text-[26px]"
              {...fieldAttr("glove.contact.details-heading")}
            >
              {get("details-heading")}
            </h2>
          ) : null}
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {email ? (
              <DetailItem
                icon={<Mail className="size-5" aria-hidden="true" />}
                label="Email"
              >
                <a
                  href={`mailto:${email}`}
                  className="break-all text-[var(--glove-primary)] underline underline-offset-4 hover:text-[var(--glove-primary-hover)]"
                >
                  {email}
                </a>
              </DetailItem>
            ) : null}
            {phone ? (
              <DetailItem
                icon={<Phone className="size-5" aria-hidden="true" />}
                label="Phone"
              >
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="text-[var(--glove-primary)] underline underline-offset-4 hover:text-[var(--glove-primary-hover)]"
                >
                  {phone}
                </a>
              </DetailItem>
            ) : null}
            {address ? (
              <DetailItem
                icon={<MapPin className="size-5" aria-hidden="true" />}
                label="Address"
              >
                <span className="whitespace-pre-line text-[var(--glove-ink)]">
                  {address}
                </span>
              </DetailItem>
            ) : null}
          </ul>
        </GloveSection>
      ) : null}
    </>
  );
}

function DetailItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--glove-primary)] text-[var(--glove-on-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="glove-display text-[14px] font-medium text-[var(--glove-muted)]">
          {label}
        </p>
        <p className="mt-0.5 text-[16px] leading-[1.5]">{children}</p>
      </div>
    </li>
  );
}
