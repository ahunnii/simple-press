import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { resolveFaqPickerItems } from "~/lib/template-fields";

import { resolveFields } from "..";
import { ModernContactForm } from "./modern-contact-form";

export function ModernContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, [
    "modern.contact.page-tagline",
    "modern.contact.page-header",
    "modern.contact.page-description",

    "modern.contact.info-title",
    "modern.contact.info-description",

    "modern.contact.form-title",
    "modern.contact.form-description",
    "modern.contact.form-success-heading",
    "modern.contact.form-success-body",

    "modern.contact.faq-tagline",
    "modern.contact.faq-heading",
  ]);

  const faqList = resolveFaqPickerItems(
    customFields?.["modern.contact.faq-list"],
    faqItems,
    6,
  );
  // Fall back to business record for contact details not set by owner
  const displayEmail = business?.supportEmail;
  const displayAddress = business?.businessAddress;
  const displayPhone = business?.phoneNumber;
  const hoursRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );

  return (
    <div className="bg-background">
      {/* Header */}
      <section
        className="bg-secondary py-20"
        {...sectionGroupAttr("contact", "main")}
      >
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <p
            className="text-muted-foreground text-xs font-semibold tracking-widest uppercase"
            {...fieldAttr("modern.contact.page-tagline")}
          >
            {f["modern.contact.page-tagline"]}
          </p>
          <h1
            className="text-foreground mt-2 font-serif text-4xl text-balance md:text-6xl"
            {...fieldAttr("modern.contact.page-header")}
          >
            {f["modern.contact.page-header"]}
          </h1>
          <p
            className="text-muted-foreground mx-auto mt-6 max-w-lg text-sm leading-relaxed"
            {...fieldAttr("modern.contact.page-description")}
          >
            {f["modern.contact.page-description"]}
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-5">
            {/* Contact Details */}
            <div
              className="lg:col-span-2"
              {...sectionGroupAttr("contact", "info")}
            >
              <h2
                className="text-foreground font-serif text-2xl md:text-3xl"
                {...fieldAttr("modern.contact.info-title")}
              >
                {f["modern.contact.info-title"]}
              </h2>
              <p
                className="text-muted-foreground mt-4 text-sm leading-relaxed"
                {...fieldAttr("modern.contact.info-description")}
              >
                {f["modern.contact.info-description"]}
              </p>

              <div className="mt-10 flex flex-col gap-8">
                {!!displayEmail && (
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Mail
                        className="text-primary h-4 w-4"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        Email
                      </h3>
                      <a
                        href={`mailto:${displayEmail}`}
                        className="text-muted-foreground hover:text-foreground mt-1 block text-sm transition-colors hover:underline hover:underline-offset-4"
                      >
                        {displayEmail}
                      </a>
                    </div>
                  </div>
                )}

                {!!displayPhone && (
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Phone
                        className="text-primary h-4 w-4"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        Phone
                      </h3>
                      <a
                        href={`tel:${displayPhone}`}
                        className="text-muted-foreground hover:text-foreground mt-1 block text-sm transition-colors hover:underline hover:underline-offset-4"
                      >
                        {displayPhone}
                      </a>
                    </div>
                  </div>
                )}

                {!!displayAddress && (
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <MapPin
                        className="text-primary h-4 w-4"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        Address
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {displayAddress}
                      </p>
                    </div>
                  </div>
                )}

                {hoursRows.length > 0 && (
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Clock
                        className="text-primary h-4 w-4"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        Hours
                      </h3>
                      <dl className="mt-1 flex flex-col gap-0.5">
                        {hoursRows.map((row) => (
                          <div key={row.label} className="flex gap-2 text-sm">
                            <dt className="text-muted-foreground">
                              {row.label}
                            </dt>
                            <dd className="text-muted-foreground">
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <div
              className="lg:col-span-3"
              {...sectionGroupAttr("contact", "form")}
            >
              <div className="border-border bg-card rounded-sm border p-8 md:p-10">
                <h2
                  className="text-foreground font-serif text-2xl md:text-3xl"
                  {...fieldAttr("modern.contact.form-title")}
                >
                  {f["modern.contact.form-title"]}
                </h2>
                <p
                  className="text-muted-foreground mt-2 text-sm"
                  {...fieldAttr("modern.contact.form-description")}
                >
                  {f["modern.contact.form-description"]}
                </p>
                <ModernContactForm
                  successHeading={f["modern.contact.form-success-heading"]}
                  successBody={f["modern.contact.form-success-body"]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ teaser */}
      {faqList.length > 0 &&
        isSectionVisible(customFields, "modern", "contact.questions") && (
          <section
            className="border-border bg-secondary border-t py-20"
            {...sectionGroupAttr("contact", "questions")}
          >
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="text-center">
                <p
                  className="text-muted-foreground text-xs font-semibold tracking-widest uppercase"
                  {...fieldAttr("modern.contact.faq-tagline")}
                >
                  {f["modern.contact.faq-tagline"]}
                </p>
                <h2
                  className="text-foreground mt-2 font-serif text-3xl md:text-4xl"
                  {...fieldAttr("modern.contact.faq-heading")}
                >
                  {f["modern.contact.faq-heading"]}
                </h2>
              </div>
              <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
                {faqList.map((faq) => (
                  <div key={faq.id}>
                    <h3 className="text-foreground text-sm font-semibold">
                      {faq.question}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
    </div>
  );
}
