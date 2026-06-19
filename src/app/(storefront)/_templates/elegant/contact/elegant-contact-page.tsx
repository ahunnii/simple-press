"use client";

import { useEffect, useState } from "react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { resolveFields } from "..";
import { ElegantContactForm } from "./elegant-contact-form";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

export function ElegantContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const [shown, setShown] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

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
  const displayPhone = f["elegant.contact.phone"] ?? business.phoneNumber ?? "";
  const displayAddress =
    f["elegant.contact.address"] ?? business.businessAddress ?? "";

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

  const contactItems = [
    displayEmail
      ? { label: "Email", value: displayEmail, href: `mailto:${displayEmail}` }
      : null,
    displayPhone
      ? {
          label: "Phone",
          value: displayPhone,
          href: `tel:${displayPhone.replace(/\D/g, "")}`,
        }
      : null,
    displayAddress
      ? { label: "Address", value: displayAddress, href: null }
      : null,
  ].filter(Boolean) as { label: string; value: string; href: string | null }[];

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)" }}>
      <section
        {...sectionGroupAttr("contact", "hero")}
        style={{ padding: "48px 40px 80px" }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div
            className="el-contact-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: 80,
            }}
          >
            {/* ── Left: info ── */}
            <div {...sectionGroupAttr("contact", "info")}>
              <div style={fadeStyle(0)}>
                <span
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace)",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--el-ink-soft, #6b6659)",
                  }}
                >
                  Contact
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontWeight: 400,
                  fontSize: "clamp(48px, 7vw, 96px)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.01em",
                  marginTop: 18,
                  color: "var(--el-ink, #1c1a17)",
                }}
              >
                <span style={{ display: "block", overflow: "hidden" }}>
                  <span style={maskStyle(0.08)}>
                    {f["elegant.contact.hero-title"] ?? "Write to"}
                  </span>
                </span>
                <span style={{ display: "block", overflow: "hidden" }}>
                  <em style={{ ...maskStyle(0.2), fontStyle: "italic" }}>
                    {f["elegant.contact.hero-subtitle"] ?? "us."}
                  </em>
                </span>
              </h1>

              {/* Description — separate reveal from contact items */}
              <div style={fadeStyle(0.2)}>
                <p
                  style={{
                    marginTop: 24,
                    color: "var(--el-ink-soft, #6b6659)",
                    fontSize: 17,
                    lineHeight: 1.7,
                    maxWidth: 380,
                    fontFamily: "var(--font-sans, sans-serif)",
                    marginBottom: 40,
                  }}
                >
                  {f["elegant.contact.info-description"] ??
                    "Questions about an order or anything else — we read every message ourselves."}
                </p>
              </div>

              {/* Contact details — staggered after description */}
              {contactItems.length > 0 && (
                <div style={fadeStyle(0.3)}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    {contactItems.map(({ label, value, href }) => (
                      <div key={label}>
                        <div
                          style={{
                            fontFamily: "var(--font-mono, ui-monospace)",
                            fontSize: 10,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: "var(--el-ink-soft, #6b6659)",
                            marginBottom: 4,
                          }}
                        >
                          {label}
                        </div>
                        {href ? (
                          <a
                            href={href}
                            style={{
                              fontSize: 15,
                              color: "var(--el-ink, #1c1a17)",
                              textDecoration: "none",
                              fontFamily: "var(--font-sans, sans-serif)",
                              lineHeight: 1.5,
                              whiteSpace: "pre-line",
                            }}
                          >
                            {value}
                          </a>
                        ) : (
                          <p
                            style={{
                              fontSize: 15,
                              color: "var(--el-ink, #1c1a17)",
                              fontFamily: "var(--font-sans, sans-serif)",
                              lineHeight: 1.5,
                              whiteSpace: "pre-line",
                              margin: 0,
                            }}
                          >
                            {value}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                  fontWeight: 400,
                  fontSize: 28,
                  letterSpacing: "-0.01em",
                  color: "var(--el-ink, #1c1a17)",
                  marginBottom: 28,
                }}
              >
                {f["elegant.contact.form-title"] ?? "Send a message"}
              </h2>
              <ElegantContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
