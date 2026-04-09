import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { ModernContactForm } from "./modern-contact-form";

export function ModernContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "modern.contact.header-subheader",
    "modern.contact.header-title",
    "modern.contact.header-description",
    "modern.contact.info-title",
    "modern.contact.info-description",
    "modern.contact.email-label",
    "modern.contact.email",
    "modern.contact.phone-label",
    "modern.contact.phone",
    "modern.contact.address-label",
    "modern.contact.address",
    "modern.contact.hours-label",
    "modern.contact.hours",
    "modern.contact.form-title",
    "modern.contact.form-description",
    "modern.contact.faq-enabled",
    "modern.contact.faq-1-question",
    "modern.contact.faq-1-answer",
    "modern.contact.faq-2-question",
    "modern.contact.faq-2-answer",
    "modern.contact.faq-3-question",
    "modern.contact.faq-3-answer",
    "modern.contact.faq-4-question",
    "modern.contact.faq-4-answer",
  ]);

  // Fall back to business record for contact details not set by owner
  const displayEmail =
    f["modern.contact.email"] ?? business?.supportEmail ?? "";
  const displayAddress =
    f["modern.contact.address"] ?? business?.businessAddress ?? "";

  return (
    <div className="bg-background">
      {/* Header */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {f["modern.contact.header-subheader"]}
          </p>
          <h1 className="text-foreground mt-2 font-serif text-4xl text-balance md:text-6xl">
            {f["modern.contact.header-title"]}
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-lg text-sm leading-relaxed">
            {f["modern.contact.header-description"]}
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-5">
            {/* Contact Details */}
            <div className="lg:col-span-2">
              <h2 className="text-foreground font-serif text-2xl md:text-3xl">
                {f["modern.contact.info-title"]}
              </h2>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {f["modern.contact.info-description"]}
              </p>

              <div className="mt-10 flex flex-col gap-8">
                {displayEmail && (
                  <div className="flex items-start gap-4">
                    <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Mail className="text-accent h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        {f["modern.contact.email-label"]}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {displayEmail}
                      </p>
                    </div>
                  </div>
                )}

                {f["modern.contact.phone"] && (
                  <div className="flex items-start gap-4">
                    <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Phone className="text-accent h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        {f["modern.contact.phone-label"]}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {f["modern.contact.phone"]}
                      </p>
                    </div>
                  </div>
                )}

                {displayAddress && (
                  <div className="flex items-start gap-4">
                    <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <MapPin className="text-accent h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        {f["modern.contact.address-label"]}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {displayAddress}
                      </p>
                    </div>
                  </div>
                )}

                {f["modern.contact.hours"] && (
                  <div className="flex items-start gap-4">
                    <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                      <Clock className="text-accent h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                        {f["modern.contact.hours-label"]}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {f["modern.contact.hours"]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="border-border bg-card rounded-sm border p-8 md:p-10">
                <h2 className="text-foreground font-serif text-2xl md:text-3xl">
                  {f["modern.contact.form-title"]}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {f["modern.contact.form-description"]}
                </p>
                <ModernContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ teaser */}
      {f["modern.contact.faq-enabled"] === "true" && (
        <section className="border-border bg-secondary border-t py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Common Questions
              </p>
              <h2 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
                Frequently Asked
              </h2>
            </div>
            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
              {f["modern.contact.faq-1-question"] && (
                <div>
                  <h3 className="text-foreground text-sm font-semibold">
                    {f["modern.contact.faq-1-question"]}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {f["modern.contact.faq-1-answer"]}
                  </p>
                </div>
              )}
              {f["modern.contact.faq-2-question"] && (
                <div>
                  <h3 className="text-foreground text-sm font-semibold">
                    {f["modern.contact.faq-2-question"]}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {f["modern.contact.faq-2-answer"]}
                  </p>
                </div>
              )}
              {f["modern.contact.faq-3-question"] && (
                <div>
                  <h3 className="text-foreground text-sm font-semibold">
                    {f["modern.contact.faq-3-question"]}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {f["modern.contact.faq-3-answer"]}
                  </p>
                </div>
              )}
              {f["modern.contact.faq-4-question"] && (
                <div>
                  <h3 className="text-foreground text-sm font-semibold">
                    {f["modern.contact.faq-4-question"]}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {f["modern.contact.faq-4-answer"]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
