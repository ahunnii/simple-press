"use client";

import { useEffect, useState } from "react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getRawCustomFieldString,
  resolveFaqPickerItems,
} from "~/lib/template-fields";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { resolveFields } from "..";
import { ElegantContactForm } from "./elegant-contact-form";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

const smallLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace)",
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--el-ink-soft, #6b6659)",
};

const itemLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, ui-monospace)",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--el-ink-soft, #6b6659)",
  marginBottom: 4,
};

const itemValueStyle: React.CSSProperties = {
  fontSize: 15,
  color: "var(--el-ink, #1c1a17)",
  fontFamily: "var(--font-sans, sans-serif)",
  lineHeight: 1.5,
  whiteSpace: "pre-line",
  margin: 0,
};

function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

type ContactItem = {
  label: string;
  value?: string;
  href?: string;
  lines?: { label: string; value: string }[];
};

export function ElegantContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, [
    "elegant.contact.hero-label",
    "elegant.contact.hero-title",
    "elegant.contact.hero-subtitle",
    "elegant.contact.info-description",
    "elegant.contact.form-title",
    "elegant.contact.form-button-label",
    "elegant.contact.form-success-heading",
    "elegant.contact.form-success-body",
    "elegant.contact.form-reset-label",
    "elegant.contact.faq-label",
    "elegant.contact.faq-heading",
  ]);

  // Contact details: Settings always wins. The old `elegant.contact.email` /
  // `phone` / `address` overrides (retired 2026-09-27) are read only as a
  // silent fallback for a site that saved one before the move — never
  // written or cleared from here. Blank everywhere → the row is omitted.
  const legacy = (key: string) =>
    nonBlank(getRawCustomFieldString(customFields, key));
  const email =
    nonBlank(business.supportEmail) ?? legacy("elegant.contact.email");
  const phone =
    nonBlank(business.phoneNumber) ?? legacy("elegant.contact.phone");
  const address =
    nonBlank(business.businessAddress) ?? legacy("elegant.contact.address");
  const hoursRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );

  const contactItems: ContactItem[] = [
    ...(email
      ? [{ label: "Email", value: email, href: `mailto:${email}` }]
      : []),
    ...(phone
      ? [
          {
            label: "Phone",
            value: phone,
            href: `tel:${phone.replace(/[^\d+]/g, "")}`,
          },
        ]
      : []),
    ...(address ? [{ label: "Address", value: address }] : []),
    ...(hoursRows.length > 0 ? [{ label: "Hours", lines: hoursRows }] : []),
  ];

  const infoDescription = f["elegant.contact.info-description"] ?? "";
  const showInfo =
    isSectionVisible(customFields, "elegant", "contact.info") &&
    (Boolean(infoDescription) || contactItems.length > 0);

  const faq = resolveFaqPickerItems(
    customFields?.["elegant.contact.faq"],
    faqItems,
    10,
  );
  const showFaq =
    faq.length > 0 && isSectionVisible(customFields, "elegant", "contact.faq");

  // resolveFields keeps a saved blank as "", so the two button labels fall
  // back to their built-in text rather than rendering an empty control.
  const buttonLabel =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- a blank label must fall back
    f["elegant.contact.form-button-label"] || "Send message";
  const resetLabel =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- a blank label must fall back
    f["elegant.contact.form-reset-label"] || "Send another message";

  const heroLabel = f["elegant.contact.hero-label"] ?? "";
  const heroTitle = f["elegant.contact.hero-title"] ?? "";
  const heroSubtitle = f["elegant.contact.hero-subtitle"] ?? "";
  const formTitle = f["elegant.contact.form-title"] ?? "";
  const faqLabel = f["elegant.contact.faq-label"] ?? "";
  const faqHeading = f["elegant.contact.faq-heading"] ?? "";

  const maskStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? { display: "block" }
      : {
          display: "block",
          transform: shown ? "translateY(0)" : "translateY(110%)",
          transition: `transform 1.1s ${easeOut} ${delay}s`,
        };

  const fadeStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)" }}>
      <section style={{ padding: "48px 40px 80px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div
            className="el-contact-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: 80,
            }}
          >
            {/* ── Left column: heading, then info ── */}
            <div>
              <div {...sectionGroupAttr("contact", "hero")}>
                {heroLabel ? (
                  <div style={fadeStyle(0)}>
                    <span
                      style={smallLabelStyle}
                      {...fieldAttr("elegant.contact.hero-label")}
                    >
                      {heroLabel}
                    </span>
                  </div>
                ) : null}

                <h1
                  style={{
                    fontFamily:
                      "var(--font-serif, 'Cormorant Garamond', serif)",
                    fontWeight: 400,
                    fontSize: "clamp(48px, 7vw, 96px)",
                    lineHeight: 0.95,
                    letterSpacing: "-0.01em",
                    marginTop: heroLabel ? 18 : 0,
                    color: "var(--el-ink, #1c1a17)",
                  }}
                >
                  <span style={{ display: "block", overflow: "hidden" }}>
                    <span
                      style={maskStyle(0.08)}
                      {...fieldAttr("elegant.contact.hero-title")}
                    >
                      {heroTitle}
                    </span>
                  </span>
                  {heroSubtitle ? (
                    <span style={{ display: "block", overflow: "hidden" }}>
                      <em
                        style={{ ...maskStyle(0.2), fontStyle: "italic" }}
                        {...fieldAttr("elegant.contact.hero-subtitle")}
                      >
                        {heroSubtitle}
                      </em>
                    </span>
                  ) : null}
                </h1>
              </div>

              {showInfo ? (
                <div
                  {...sectionGroupAttr("contact", "info")}
                  style={{ marginTop: 24 }}
                >
                  {/* Description — separate reveal from contact items */}
                  {infoDescription ? (
                    <div style={fadeStyle(0.2)}>
                      <p
                        style={{
                          color: "var(--el-ink-soft, #6b6659)",
                          fontSize: 17,
                          lineHeight: 1.7,
                          maxWidth: 380,
                          fontFamily: "var(--font-sans, sans-serif)",
                          marginBottom: 40,
                        }}
                        {...fieldAttr("elegant.contact.info-description")}
                      >
                        {infoDescription}
                      </p>
                    </div>
                  ) : null}

                  {/* Contact details (Settings) — staggered after description */}
                  {contactItems.length > 0 && (
                    <div
                      style={{
                        ...fadeStyle(0.3),
                        marginTop: infoDescription ? 0 : 16,
                      }}
                    >
                      <h2 className="sr-only">Contact details</h2>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 20,
                        }}
                      >
                        {contactItems.map(({ label, value, href, lines }) => (
                          <div key={label}>
                            <div style={itemLabelStyle}>{label}</div>
                            {lines ? (
                              <dl
                                style={{
                                  margin: 0,
                                  display: "grid",
                                  gridTemplateColumns: "auto 1fr",
                                  columnGap: 20,
                                  rowGap: 2,
                                  maxWidth: 380,
                                }}
                              >
                                {lines.map((line, i) => (
                                  <div
                                    key={line.label + String(i)}
                                    style={{ display: "contents" }}
                                  >
                                    <dt style={itemValueStyle}>{line.label}</dt>
                                    <dd
                                      style={{
                                        ...itemValueStyle,
                                        color: "var(--el-ink-soft, #6b6659)",
                                      }}
                                    >
                                      {line.value}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            ) : href ? (
                              <a
                                href={href}
                                style={{
                                  ...itemValueStyle,
                                  textDecoration: "none",
                                }}
                              >
                                {value}
                              </a>
                            ) : (
                              <p style={itemValueStyle}>{value}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* ── Right: form panel ── */}
            <div
              {...sectionGroupAttr("contact", "form")}
              style={{
                ...fadeStyle(0.2),
                background: "var(--el-paper, #fbf8f2)",
                border: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                borderRadius: 8,
                padding: "40px 36px",
              }}
            >
              {formTitle ? (
                <h2
                  style={{
                    fontFamily:
                      "var(--font-serif, 'Cormorant Garamond', serif)",
                    fontWeight: 400,
                    fontSize: 28,
                    letterSpacing: "-0.01em",
                    color: "var(--el-ink, #1c1a17)",
                    marginBottom: 28,
                  }}
                  {...fieldAttr("elegant.contact.form-title")}
                >
                  {formTitle}
                </h2>
              ) : null}
              <ElegantContactForm
                successHeading={f["elegant.contact.form-success-heading"] ?? ""}
                successBody={f["elegant.contact.form-success-body"] ?? ""}
                resetLabel={resetLabel}
                buttonLabel={buttonLabel}
              />
            </div>
          </div>
        </div>
      </section>

      {showFaq ? (
        <section
          {...sectionGroupAttr("contact", "faq")}
          style={{ padding: "0 40px 120px" }}
        >
          <div
            style={{
              maxWidth: 1360,
              margin: "0 auto",
              borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
              paddingTop: 64,
            }}
          >
            <div
              className="el-contact-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr",
                gap: 80,
              }}
            >
              <div>
                {faqLabel ? (
                  <span
                    style={smallLabelStyle}
                    {...fieldAttr("elegant.contact.faq-label")}
                  >
                    {faqLabel}
                  </span>
                ) : null}
                {faqHeading ? (
                  <h2
                    style={{
                      fontFamily:
                        "var(--font-serif, 'Cormorant Garamond', serif)",
                      fontWeight: 400,
                      fontSize: "clamp(36px, 4.5vw, 56px)",
                      lineHeight: 1,
                      letterSpacing: "-0.01em",
                      marginTop: faqLabel ? 18 : 0,
                      color: "var(--el-ink, #1c1a17)",
                    }}
                    {...fieldAttr("elegant.contact.faq-heading")}
                  >
                    {faqHeading}
                  </h2>
                ) : (
                  <h2 className="sr-only">Frequently asked questions</h2>
                )}
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
                }}
              >
                {faq.map((row) => (
                  <details
                    key={row.id}
                    className="group"
                    style={{
                      borderBottom:
                        "1px solid var(--el-line, rgba(28,26,23,0.12))",
                    }}
                  >
                    <summary
                      className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--el-sage)] [&::-webkit-details-marker]:hidden"
                      style={{
                        fontFamily:
                          "var(--font-serif, 'Cormorant Garamond', serif)",
                        fontSize: 22,
                        lineHeight: 1.3,
                        color: "var(--el-ink, #1c1a17)",
                      }}
                    >
                      <span>{row.question}</span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 transition-transform duration-300 group-open:rotate-45"
                        style={{
                          fontFamily: "var(--font-sans, sans-serif)",
                          fontSize: 20,
                          fontWeight: 300,
                          color: "var(--el-ink-soft, #6b6659)",
                        }}
                      >
                        +
                      </span>
                    </summary>
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.7,
                        color: "var(--el-ink-soft, #6b6659)",
                        fontFamily: "var(--font-sans, sans-serif)",
                        whiteSpace: "pre-line",
                        maxWidth: 640,
                        margin: 0,
                        paddingBottom: 24,
                      }}
                    >
                      {row.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
