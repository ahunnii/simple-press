import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { ElegantContactForm } from "./elegant-contact-form";

export function ElegantContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "elegant.contact.hero-title",
    "elegant.contact.hero-subtitle",
    "elegant.contact.info-title",
    "elegant.contact.info-description",
    "elegant.contact.email",
    "elegant.contact.phone",
    "elegant.contact.address",
    "elegant.contact.form-title",
  ]);

  const displayEmail =
    f["elegant.contact.email"] ?? business.supportEmail ?? "";
  const displayAddress =
    f["elegant.contact.address"] ?? business.businessAddress ?? "";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-secondary/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground mb-3 text-sm tracking-widest uppercase">
            Get in Touch
          </p>
          <h1 className="text-foreground font-serif text-4xl font-light tracking-wide md:text-5xl">
            {f["elegant.contact.hero-title"] ?? "Contact Us"}
          </h1>
          {(f["elegant.contact.hero-subtitle"] ?? "") && (
            <p className="text-muted-foreground mt-4 text-lg">
              {f["elegant.contact.hero-subtitle"]}
            </p>
          )}
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Contact Details */}
          <div className="lg:col-span-2">
            <h2 className="text-foreground mb-4 font-serif text-2xl font-light tracking-wide">
              {f["elegant.contact.info-title"] ?? "Let's Connect"}
            </h2>
            {(f["elegant.contact.info-description"] ?? "") && (
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                {f["elegant.contact.info-description"]}
              </p>
            )}

            <div className="flex flex-col gap-6">
              {displayEmail && (
                <div className="flex items-start gap-4">
                  <div className="bg-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Mail className="text-foreground h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs tracking-widest uppercase">
                      Email
                    </p>
                    <a
                      href={`mailto:${displayEmail}`}
                      className="text-foreground hover:text-muted-foreground mt-1 text-sm"
                    >
                      {displayEmail}
                    </a>
                  </div>
                </div>
              )}

              {(f["elegant.contact.phone"] ?? "") && (
                <div className="flex items-start gap-4">
                  <div className="bg-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Phone className="text-foreground h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs tracking-widest uppercase">
                      Phone
                    </p>
                    <p className="text-foreground mt-1 text-sm">
                      {f["elegant.contact.phone"]}
                    </p>
                  </div>
                </div>
              )}

              {displayAddress && (
                <div className="flex items-start gap-4">
                  <div className="bg-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <MapPin className="text-foreground h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs tracking-widest uppercase">
                      Address
                    </p>
                    <p className="text-foreground mt-1 text-sm leading-relaxed">
                      {displayAddress}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="boty-shadow bg-card rounded-3xl p-8 md:p-10 lg:col-span-3">
            <h2 className="text-foreground mb-6 font-serif text-2xl font-light tracking-wide">
              {f["elegant.contact.form-title"] ?? "Send a Message"}
            </h2>
            <ElegantContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
