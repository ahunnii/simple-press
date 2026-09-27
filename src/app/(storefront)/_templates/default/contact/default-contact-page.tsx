import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { resolveFaqPickerItems } from "~/lib/template-fields";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import {
  DEFAULT_CONTACT_ADDRESS_BODY,
  DEFAULT_CONTACT_ADDRESS_LABEL,
  DEFAULT_CONTACT_EMAIL_BODY,
  DEFAULT_CONTACT_EMAIL_LABEL,
  DEFAULT_CONTACT_EMAIL_LINK_LABEL,
  DEFAULT_CONTACT_FAQ_EYEBROW,
  DEFAULT_CONTACT_FAQ_HEADING,
  DEFAULT_CONTACT_FORM_SUBMIT_LABEL,
  DEFAULT_CONTACT_FORM_SUCCESS_BODY,
  DEFAULT_CONTACT_FORM_SUCCESS_BUTTON,
  DEFAULT_CONTACT_FORM_SUCCESS_HEADING,
  DEFAULT_CONTACT_HOURS_LABEL,
  DEFAULT_CONTACT_PHONE_BODY,
  DEFAULT_CONTACT_PHONE_LABEL,
  DEFAULT_CONTACT_PHONE_LINK_LABEL,
} from ".";
import { DefaultContactForm } from "./default-contact-form";

function FaqItem({
  question,
  answer,
  defaultOpen,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-[#e8e8e8] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        {question}
        <span
          aria-hidden="true"
          className="ml-4 shrink-0 text-xl font-light transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p className="pt-3.5 text-sm leading-[1.7] text-[#6b6b6b]">{answer}</p>
    </details>
  );
}

type ContactCard = {
  key: string;
  Icon: typeof Mail;
  label: string;
  labelAttrs: Record<string, string>;
  heading?: string;
  body?: string;
  bodyAttrs?: Record<string, string>;
  href?: string;
  linkLabel?: string;
  linkLabelAttrs?: Record<string, string>;
  /** Hours rows — mutually exclusive with body/href/linkLabel above. */
  lines?: { label: string; value: string }[];
};

export function DefaultContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, [
    "default.contact.eyebrow",
    "default.contact.heading",
    "default.contact.description",
    "default.contact.email-label",
    "default.contact.email-body",
    "default.contact.email-link-label",
    "default.contact.phone-label",
    "default.contact.phone-body",
    "default.contact.phone-link-label",
    "default.contact.address-label",
    "default.contact.address-body",
    "default.contact.hours-label",
    "default.contact.form-success-heading",
    "default.contact.form-success-body",
    "default.contact.form-success-button",
    "default.contact.form-submit-label",
    "default.contact.faq-eyebrow",
    "default.contact.faq-heading",
  ]);

  const faqs = resolveFaqPickerItems(
    customFields?.["default.contact.faq"],
    faqItems,
    6,
  );

  // Hours: Settings → Business Hours. Hidden entirely when none are set.
  const hoursRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );

  const contactCards: ContactCard[] = [
    ...(business.supportEmail
      ? [
          {
            key: "email",
            Icon: Mail,
            label: f["default.contact.email-label"] ?? DEFAULT_CONTACT_EMAIL_LABEL,
            labelAttrs: fieldAttr("default.contact.email-label"),
            heading: business.supportEmail,
            body: f["default.contact.email-body"] ?? DEFAULT_CONTACT_EMAIL_BODY,
            bodyAttrs: fieldAttr("default.contact.email-body"),
            href: `mailto:${business.supportEmail}`,
            linkLabel:
              f["default.contact.email-link-label"] ??
              DEFAULT_CONTACT_EMAIL_LINK_LABEL,
            linkLabelAttrs: fieldAttr("default.contact.email-link-label"),
          },
        ]
      : []),
    ...(business.phoneNumber
      ? [
          {
            key: "phone",
            Icon: Phone,
            label: f["default.contact.phone-label"] ?? DEFAULT_CONTACT_PHONE_LABEL,
            labelAttrs: fieldAttr("default.contact.phone-label"),
            heading: business.phoneNumber,
            body: f["default.contact.phone-body"] ?? DEFAULT_CONTACT_PHONE_BODY,
            bodyAttrs: fieldAttr("default.contact.phone-body"),
            href: `tel:${business.phoneNumber}`,
            linkLabel:
              f["default.contact.phone-link-label"] ??
              DEFAULT_CONTACT_PHONE_LINK_LABEL,
            linkLabelAttrs: fieldAttr("default.contact.phone-link-label"),
          },
        ]
      : []),
    ...(business.businessAddress
      ? [
          {
            key: "address",
            Icon: MapPin,
            label:
              f["default.contact.address-label"] ??
              DEFAULT_CONTACT_ADDRESS_LABEL,
            labelAttrs: fieldAttr("default.contact.address-label"),
            heading: business.businessAddress,
            body:
              f["default.contact.address-body"] ?? DEFAULT_CONTACT_ADDRESS_BODY,
            bodyAttrs: fieldAttr("default.contact.address-body"),
          },
        ]
      : []),
    ...(hoursRows.length > 0
      ? [
          {
            key: "hours",
            Icon: Clock,
            label: f["default.contact.hours-label"] ?? DEFAULT_CONTACT_HOURS_LABEL,
            labelAttrs: fieldAttr("default.contact.hours-label"),
            lines: hoursRows,
          },
        ]
      : []),
  ];

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("contact", "header")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {f["default.contact.eyebrow"] && (
            <span
              className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
              {...fieldAttr("default.contact.eyebrow")}
            >
              {f["default.contact.eyebrow"]}
            </span>
          )}
          <h1
            className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]"
            {...fieldAttr("default.contact.heading")}
          >
            {f["default.contact.heading"] ?? "Say hello."}
          </h1>
          {f["default.contact.description"] && (
            <p
              className="mt-4 max-w-[560px] text-[17px] text-[#6b6b6b]"
              {...fieldAttr("default.contact.description")}
            >
              {f["default.contact.description"]}
            </p>
          )}
        </div>
      </section>

      {/* ── Form + sidebar ───────────────────────────────────────────────── */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_320px]">
            {/* Contact form */}
            <div {...sectionGroupAttr("contact", "form")}>
              <DefaultContactForm
                successHeading={
                  f["default.contact.form-success-heading"] ??
                  DEFAULT_CONTACT_FORM_SUCCESS_HEADING
                }
                successBody={
                  f["default.contact.form-success-body"] ??
                  DEFAULT_CONTACT_FORM_SUCCESS_BODY
                }
                successButtonText={
                  f["default.contact.form-success-button"] ??
                  DEFAULT_CONTACT_FORM_SUCCESS_BUTTON
                }
                submitLabel={
                  f["default.contact.form-submit-label"] ??
                  DEFAULT_CONTACT_FORM_SUBMIT_LABEL
                }
                submitLabelAttrs={fieldAttr("default.contact.form-submit-label")}
              />
            </div>

            {/* Sidebar — info cards */}
            {contactCards.length > 0 && (
              <aside
                className="flex flex-col gap-4"
                {...sectionGroupAttr("contact", "info")}
              >
                {contactCards.map((card) => (
                  <div
                    key={card.key}
                    className="flex flex-col gap-2 rounded-(--radius) border border-[#e8e8e8] p-6"
                  >
                    <span
                      className="text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
                      {...card.labelAttrs}
                    >
                      {card.label}
                    </span>
                    {card.heading && (
                      <h2 className="font-serif text-[20px] font-medium tracking-[-0.01em]">
                        {card.heading}
                      </h2>
                    )}
                    {card.lines ? (
                      <dl className="mt-1 space-y-0.5">
                        {card.lines.map((line, i) => (
                          <div
                            key={line.label + String(i)}
                            className="flex items-baseline justify-between gap-3 text-[13px]"
                          >
                            <dt className="text-[#6b6b6b]">{line.label}</dt>
                            <dd className="text-[#6b6b6b]">{line.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <>
                        {card.body && (
                          <p
                            className="text-[13px] leading-relaxed text-[#6b6b6b]"
                            {...card.bodyAttrs}
                          >
                            {card.body}
                          </p>
                        )}
                        {card.href && card.linkLabel && (
                          <a
                            href={card.href}
                            className="mt-1 inline-flex items-center gap-1.5 self-start border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-2.5"
                          >
                            <span {...card.linkLabelAttrs}>
                              {card.linkLabel}
                            </span>{" "}
                            <span aria-hidden="true">→</span>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </aside>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      {faqs.length > 0 &&
        isSectionVisible(customFields, "default", "contact.faq") && (
          <section
            {...sectionGroupAttr("contact", "faq")}
            className="bg-[#efece8] px-6 py-20 lg:px-8"
          >
            <div className="mx-auto max-w-[760px]">
              <div className="mb-12 text-center">
                <span
                  className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
                  {...fieldAttr("default.contact.faq-eyebrow")}
                >
                  {f["default.contact.faq-eyebrow"] ?? DEFAULT_CONTACT_FAQ_EYEBROW}
                </span>
                <h2
                  className="mt-3 font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]"
                  {...fieldAttr("default.contact.faq-heading")}
                >
                  {f["default.contact.faq-heading"] ?? DEFAULT_CONTACT_FAQ_HEADING}
                </h2>
              </div>
              <div>
                {faqs.map((item, i) => (
                  <FaqItem
                    key={item.id}
                    question={item.question}
                    answer={item.answer}
                    defaultOpen={i === 0}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
    </PageTransition>
  );
}
