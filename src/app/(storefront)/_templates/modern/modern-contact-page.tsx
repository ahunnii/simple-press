import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../types";

import { ModernContactForm } from "./modern-contact-form";

export function ModernContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  return (
    <div className="bg-background">
      {/* Header */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {themeSpecificFields?.["modern.contact.header-subheader"] ??
              "Get in Touch"}
          </p>
          <h1 className="text-foreground mt-2 font-serif text-4xl text-balance md:text-6xl">
            {themeSpecificFields?.["modern.contact.header-title"] ??
              "We'd love to hear from you"}
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-lg text-sm leading-relaxed">
            {themeSpecificFields?.["modern.contact.header-description"] ??
              "Whether you have a question about an order, want to learn more about our products, or are interested in a partnership, we're here to help."}
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
                {themeSpecificFields?.["modern.contact.info-title"] ??
                  "Contact Information"}
              </h2>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {themeSpecificFields?.["modern.contact.info-description"] ??
                  "Reach out through any of these channels and we'll get back to you as soon as possible."}
              </p>

              <div className="mt-10 flex flex-col gap-8">
                <div className="flex items-start gap-4">
                  <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Mail className="text-accent h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                      {themeSpecificFields?.["modern.contact.email-label"] ??
                        "Email"}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {themeSpecificFields?.["modern.contact.email"] ??
                        business?.supportEmail ??
                        "hello@haven.com"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Phone className="text-accent h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                      {themeSpecificFields?.["modern.contact.phone-label"] ??
                        "Phone"}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {themeSpecificFields?.["modern.contact.phone"] ??
                        "+1 (555) 123-4567"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <MapPin className="text-accent h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                      {themeSpecificFields?.["modern.contact.address-label"] ??
                        "Address"}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {themeSpecificFields?.["modern.contact.address"] ??
                        business?.businessAddress ??
                        "247 West 35th Street\nNew York, NY 10001"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-accent/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Clock className="text-accent h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold tracking-widest uppercase">
                      {themeSpecificFields?.["modern.contact.hours-label"] ??
                        "Hours"}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {themeSpecificFields?.["modern.contact.hours"] ??
                        "Monday - Friday: 9am - 6pm EST\nSaturday: 10am - 4pm EST\nSunday: Closed"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="border-border bg-card rounded-sm border p-8 md:p-10">
                <h2 className="text-foreground font-serif text-2xl md:text-3xl">
                  {themeSpecificFields?.["modern.contact.form-title"] ??
                    "Send us a message"}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {themeSpecificFields?.["modern.contact.form-description"] ??
                    "Fill out the form below and we'll respond within 24 hours."}
                </p>
                <ModernContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="border-border bg-secondary border-t py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {themeSpecificFields?.["modern.contact.faq-subheader"] ??
                "Common Questions"}
            </p>
            <h2 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
              {themeSpecificFields?.["modern.contact.faq-title"] ??
                "Frequently Asked"}
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                {themeSpecificFields?.["modern.contact.faq-1-question"] ??
                  "What is your return policy?"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {themeSpecificFields?.["modern.contact.faq-1-answer"] ??
                  "We offer a 30-day return policy on all items in their original condition. Simply contact us to initiate a return and we'll provide a prepaid shipping label."}
              </p>
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                {themeSpecificFields?.["modern.contact.faq-2-question"] ??
                  "How long does shipping take?"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {themeSpecificFields?.["modern.contact.faq-2-answer"] ??
                  "Standard shipping takes 5-7 business days. We also offer expedited shipping (2-3 business days) at checkout for an additional fee."}
              </p>
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                {themeSpecificFields?.["modern.contact.faq-3-question"] ??
                  "Do you ship internationally?"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {themeSpecificFields?.["modern.contact.faq-3-answer"] ??
                  "Yes! We ship to over 40 countries. International shipping typically takes 10-15 business days. Duties and taxes may apply depending on your location."}
              </p>
            </div>
            <div>
              <h3 className="text-foreground text-sm font-semibold">
                {themeSpecificFields?.["modern.contact.faq-4-question"] ??
                  "Can I modify or cancel an order?"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {themeSpecificFields?.["modern.contact.faq-4-answer"] ??
                  "Orders can be modified or cancelled within 2 hours of placement. After that, please contact us and we'll do our best to accommodate your request."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
