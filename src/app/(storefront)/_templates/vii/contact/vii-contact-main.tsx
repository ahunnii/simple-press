"use client";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";
import { hasViiSocialLinks, ViiSocialLinks } from "../shared/vii-social-links";
import { ViiContactForm } from "./vii-contact-form";

type Props = {
  overline: string;
  heading: string;
  headingAccent: string;
  body: string;
  hourRows: { label: string; value: string }[];
  formHeading: string;
  formSuccessHeading: string;
  formSuccessBody: string;
  address?: string;
  phone?: string;
  email?: string;
  /** Raw `siteContent.socialLinks` JSON (Content → Branding). */
  socialLinks?: unknown;
};

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--vii-ink-soft)",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "clamp(14px, 1.3vw, 16px)",
          lineHeight: 1.7,
          color: "var(--vii-navy)",
          whiteSpace: "pre-line",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ViiContactMain({
  overline,
  heading,
  headingAccent,
  body,
  hourRows,
  formHeading,
  formSuccessHeading,
  formSuccessBody,
  address,
  phone,
  email,
  socialLinks,
}: Props) {
  const { ref: infoRef, visible: infoVisible } = useViiReveal(0.08);
  const { ref: formRef, visible: formVisible } = useViiReveal(0.08);

  const phoneHref = phone ? `tel:${phone.replace(/\s/g, "")}` : undefined;

  return (
    <section
      aria-labelledby="contact-main-heading"
      {...sectionGroupAttr("contact", "main")}
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(64px, 9vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: "clamp(48px, 7vw, 96px)",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          alignItems: "start",
        }}
        className="vii-contact-columns"
      >
        {/* Left — intro + info */}
        <div
          ref={infoRef}
          className={cn("vii-reveal", infoVisible && "is-visible")}
        >
          {overline && (
            <ViiOverline
              align="left"
              tone="light"
              style={{ marginBottom: 14 }}
              fieldKey="vii.contact.intro-overline"
            >
              {overline}
            </ViiOverline>
          )}

          <h2
            id="contact-main-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(34px, 4.6vw, 60px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}{" "}
            {headingAccent && (
              <em
                {...fieldAttr("vii.contact.intro-heading-accent")}
                style={{ fontStyle: "italic", color: "var(--vii-copper)" }}
              >
                {headingAccent}
              </em>
            )}
          </h2>

          {body && (
            <p
              {...fieldAttr("vii.contact.intro-body")}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.8,
                color: "var(--vii-ink-soft)",
                margin: "28px 0 0",
                maxWidth: 520,
              }}
            >
              {body}
            </p>
          )}

          <div
            style={{
              marginTop: "clamp(32px, 4vw, 48px)",
              display: "grid",
              gap: 28,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {address && <InfoBlock label="Visit">{address}</InfoBlock>}
            {phone && (
              <InfoBlock label="Call">
                <a
                  href={phoneHref}
                  style={{ color: "inherit", textDecoration: "none" }}
                  className="transition-opacity hover:opacity-70"
                >
                  {phone}
                </a>
              </InfoBlock>
            )}
            {email && (
              <InfoBlock label="Email">
                <a
                  href={`mailto:${email}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                  className="transition-opacity hover:opacity-70"
                >
                  {email}
                </a>
              </InfoBlock>
            )}
            {hourRows.length > 0 && (
              <InfoBlock label="Hours">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {hourRows.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        fontFamily: "var(--font-sans)",
                        fontSize: "clamp(13px, 1.2vw, 15px)",
                        lineHeight: 1.7,
                        color: "var(--vii-navy)",
                      }}
                    >
                      <span>{row.label}</span>
                      <span style={{ color: "var(--vii-ink-soft)" }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </InfoBlock>
            )}
          </div>

          {hasViiSocialLinks(socialLinks) && (
            <div style={{ marginTop: "clamp(28px, 4vw, 40px)" }}>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--vii-ink-soft)",
                  marginBottom: 6,
                }}
              >
                Follow us on
              </p>
              <ViiSocialLinks socialLinks={socialLinks} />
            </div>
          )}
        </div>

        {/* Right — form card */}
        <div
          ref={formRef}
          className={cn("vii-reveal", formVisible && "is-visible")}
          style={{
            background: "var(--vii-paper)",
            borderRadius: "var(--radius)",
            padding: "clamp(28px, 4vw, 48px)",
            boxShadow:
              "0 1px 40px color-mix(in srgb, var(--vii-navy) 6%, transparent)",
          }}
        >
          <ViiContactForm
            heading={formHeading}
            successHeading={formSuccessHeading}
            successBody={formSuccessBody}
          />
        </div>
      </div>
    </section>
  );
}
