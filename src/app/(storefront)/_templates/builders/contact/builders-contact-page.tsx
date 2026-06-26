import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "../index";
import { BuildersContactForm } from "./builders-contact-form";

export function BuildersContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "builders.contact.header",
    "builders.contact.subheader",
    "builders.contact.shop-label",
  ]);

  const address = business.businessAddress;
  const email = business.supportEmail;
  const phone = business.phoneNumber;

  const hourRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );

  const contactHeader =
    f["builders.contact.header"] ?? "Let's build together.";
  const contactSubheader =
    f["builders.contact.subheader"] ??
    "Whether you have a specific restoration project in mind, want to learn more about our cooperative model, or just want to say hello, we're here. We believe in direct, honest communication—no corporate speak, just real people doing hard work.";
  const shopLabel = f["builders.contact.shop-label"] ?? "The Shop";

  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* ── Page header ── */}
      <section
        className="mx-auto w-full max-w-[1280px] px-4 pt-24 md:px-12"
        {...sectionGroupAttr("contact", "info")}
      >
        <header className="max-w-3xl">
          <h1
            className="mb-6 text-4xl uppercase leading-none tracking-tight md:text-6xl"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 300,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {contactHeader}
          </h1>
          <p
            className="border-l pl-8 text-lg leading-relaxed md:text-xl"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
              borderColor: "var(--builders-accent, #FFC5B6)",
              color: "var(--builders-muted, #53433F)",
            }}
          >
            {contactSubheader}
          </p>
        </header>
      </section>

      {/* ── Two-column layout: form + info ── */}
      <section className="mx-auto w-full max-w-[1280px] px-4 md:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Form — 7/12 columns */}
          <div className="md:col-span-7">
            <div
              className="border p-8"
              style={{
                background: "var(--builders-surface, #fff)",
                borderColor: "var(--builders-rule, #e5e7eb)",
              }}
            >
              <BuildersContactForm />
            </div>
          </div>

          {/* Info — 5/12 columns */}
          <div className="flex flex-col gap-12 md:col-span-5">
            {/* The Shop (address) */}
            {address && (
              <div
                className="flex flex-col gap-4 border-l pl-8"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  {shopLabel}
                </h2>
                <address
                  className="not-italic flex flex-col gap-1 text-base leading-relaxed"
                  style={{
                    fontFamily:
                      "var(--font-builders-body, 'Agdasima', sans-serif)",
                    color: "var(--builders-muted, #53433F)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {address}
                </address>
              </div>
            )}

            {/* Direct Lines (email + phone) */}
            {(email ?? phone) && (
              <div
                className="flex flex-col gap-4 border-l pl-8"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  Direct Lines
                </h2>
                <div
                  className="flex flex-col gap-3 text-base"
                  style={{
                    fontFamily:
                      "var(--font-builders-body, 'Agdasima', sans-serif)",
                    color: "var(--builders-muted, #53433F)",
                  }}
                >
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="transition-colors hover:text-[#D98A78]"
                    >
                      {email}
                    </a>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone.replace(/\D/g, "")}`}
                      className="transition-colors hover:text-[#D98A78]"
                    >
                      {phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Hours */}
            {hourRows.length > 0 && (
              <div
                className="flex flex-col gap-4 border-l pl-8"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  Hours
                </h2>
                <dl
                  className="flex flex-col gap-2 text-base"
                  style={{
                    fontFamily:
                      "var(--font-builders-body, 'Agdasima', sans-serif)",
                    color: "var(--builders-muted, #53433F)",
                  }}
                >
                  {hourRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between"
                      style={{
                        maxWidth: "220px",
                        ...(row.value === "Closed" ? { opacity: 0.5 } : {}),
                      }}
                    >
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
